import path from "node:path";
import { readdir, mkdir, rename, rm, stat } from "node:fs/promises";
import { basename } from "node:path";
import crypto from 'node:crypto';
import type { 
    TComicDataModel, 
    TLibraryEntry, 
    TLibraryGroup, 
    TLibraryModel, 
    TLibraryPref, 
    TPreferencesModel, 
    TWikiModel 
} from "#src/types.ts";
import fs from "node:fs";

const COMIC_EXTENSIONS = new Set(['.cbz', '.cbr', '.cb7', '.cbt']);
const IDENTIFY_CONCURRENCY = 4;
const STAT_CONCURRENCY = 64;

const uidFromPath = (absPath: string) => {
    const hash = crypto.createHash('sha256').update(absPath).digest('hex');
    return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
};

const mapWithConcurrency = async <T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
    const results = new Array<R>(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await fn(items[index]!, index);
        }
    });
    await Promise.all(workers);
    return results;
};

export class LibraryModel implements TLibraryModel {

    private prefsModel: TPreferencesModel;
    private wikiModel: TWikiModel;
    private comicDataModel: TComicDataModel;
    private libPaths: string[];
    private db: TLibraryEntry[] = [];
    private pref: TLibraryPref[] = [];
    private entryLibraryIndex = new Map<string, number>();
    private entryByUid = new Map<string, TLibraryEntry>();
    private inheritanceCache: TLibraryEntry[] | null = null;
    public ready: Promise<void>;

    constructor(
        prefsModel: TPreferencesModel,
        wikiModel: TWikiModel,
        comicDataModel: TComicDataModel
    ) {
        this.prefsModel = prefsModel;
        this.wikiModel = wikiModel;
        this.comicDataModel = comicDataModel;
        this.libPaths = this.prefsModel.getAppSettings().outputDirs.map(p => path.resolve(p));
        this.ready = this.scan();
    }

    scan = async () => {

        this.loadPreferences();

        const entries = (await Promise.all(
            this.libPaths.map(async (libPath, libIndex) => {
                const dirEntries = await readdir(libPath, { withFileTypes: true, recursive: true });
                return dirEntries
                .filter(entry => entry.isDirectory() || COMIC_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
                .map(entry => ({ entry, libIndex }));
            })
        )).flat();

        this.entryLibraryIndex = new Map();

        const prefsByUid = new Map(this.pref.map(pref => [pref.uid, pref]));

        this.db = await mapWithConcurrency(entries, STAT_CONCURRENCY, async ({ entry, libIndex }) => {
            const absPath = path.resolve(entry.parentPath, entry.name);
            const stats = await stat(absPath);
            const uid = uidFromPath(absPath);
            const returnable: TLibraryEntry = {
                uid,
                did: entry.isDirectory(),
                name: basename(entry.name),
                path: absPath,
                parentId: undefined as string | undefined,
                createdAt: stats.mtimeMs,
            }
            this.entryLibraryIndex.set(uid, libIndex);
            const preferences = prefsByUid.get(uid);
            if (preferences){
                returnable.prefPublisher = preferences.prefPublisher;
                returnable.prefInheritance = preferences.recursive;
                returnable.prefCover = preferences.prefCover;
            }
            return returnable;
        });

        const uidByPath = new Map(this.db.map(entry => [entry.path, entry.uid]));

        this.db.forEach((entry, index) => {
            const parentPath = path.resolve(entries[index]!.entry.parentPath);
            entry.parentId = uidByPath.get(parentPath);
        });

        this.db.sort((a, b) => {
            if (a.did !== b.did) return a.did ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        this.entryByUid = new Map(this.db.map(entry => [entry.uid, entry]));
        this.inheritanceCache = null;

        await this.identifyComics();

    };

    private identifyComics = async () => {

        const stored = this.comicDataModel.getAll();
        const toIdentify: TLibraryEntry[] = [];

        for (const entry of this.db) {
            if (entry.did) continue;
            const existing = stored[entry.uid];
            if (existing?.identified === true) {
                entry.identified = true;
                entry.comic = existing.comic;
            } else if (existing?.identified === false) {
                entry.identified = false;
                entry.thumbnail = true;
            } else {
                toIdentify.push(entry);
            }
        }

        for (let i = 0; i < toIdentify.length; i += IDENTIFY_CONCURRENCY) {
            const batch = toIdentify.slice(i, i + IDENTIFY_CONCURRENCY);
            await Promise.all(batch.map(async (entry) => {
                try {
                    const found = await this.wikiModel.getComic(entry.name);
                    if (found) {
                        this.comicDataModel.upsert(entry.uid, {
                            prefId: found.pageId,
                            sourceWiki: found.sourceWiki,
                            identified: true,
                            comic: found,
                        });
                        entry.identified = true;
                        entry.comic = found;
                    } else {
                        this.comicDataModel.upsert(entry.uid, { identified: false });
                        entry.identified = false;
                        entry.thumbnail = true;
                    }
                } catch (e) {
                    if (e instanceof Error) console.log(`[ERROR]: ${e.message}`);
                }
            }));
        }

        this.inheritanceCache = null;

    };

    private loadPreferences = () => {
        this.pref = this.prefsModel.getAllLibraryPrefs();
    }

    getPreferences = (uid: string) => {
        return this.pref.find(pref => pref.uid === uid);
    }

    updatePreferences = async (uid: string, updates: Partial<Omit<TLibraryPref, 'uid'>>) => {
        const updated = this.prefsModel.upsertLibraryPref(uid, updates);
        const existing = this.pref.find(p => p.uid === uid);
        if (existing) {
            Object.assign(existing, updated);
        } else {
            this.pref.push(updated);
        }
        const dbEntry = this.entryByUid.get(uid);
        if (dbEntry) {
            dbEntry.prefPublisher = updated.prefPublisher;
            dbEntry.prefInheritance = updated.recursive;
            dbEntry.prefCover = updated.prefCover;
        }
        this.inheritanceCache = null;
    }

    /**
     * Applies parent-folder publisher inheritance across the whole library.
     * The result is memoised until the next scan or preference change, so repeat
     * reads of the library never recompute it.
     */
    private resolveInheritance = (): TLibraryEntry[] => {

        if (this.inheritanceCache) return this.inheritanceCache;

        this.inheritanceCache = this.db.map(entry => {
            if (entry.prefPublisher) return entry;
            let parentId = entry.parentId;
            while (parentId) {
                const parent = this.entryByUid.get(parentId);
                if (!parent) break;
                if (parent.prefInheritance && parent.prefPublisher) {
                    return { ...entry, prefPublisher: parent.prefPublisher };
                }
                parentId = parent.parentId;
            }
            return entry;
        });

        return this.inheritanceCache;

    }

    /**
     * Returns the entry with the given uid.
     * @param uid The uid of the entry to get.
     * @returns The entry with the given uid.
     */
    get = (uid?: string) => {
        if (!uid) return this.resolveInheritance();
        return this.entryByUid.get(uid);
    }

    /**
     * Returns the library entries grouped per configured library (OUTPUT_DIR).
     */
    getByLibrary = (): TLibraryGroup[] => {
        const resolved = this.resolveInheritance();
        return this.libPaths.map((libPath, libIndex) => ({
            uid: uidFromPath(libPath),
            name: basename(libPath),
            path: libPath,
            entries: resolved.filter(entry => this.entryLibraryIndex.get(entry.uid) === libIndex),
        }));
    }

    /**
     * Re-scans the library and refreshes the "db" property.
     */
    refresh = async () => {
        this.db = [];
        await this.scan();
    }

    /**
     * Creates a new folder in the library.
     * @param folderName The name of the new folder.
     * @param parentFolderUid The uid of the parent folder. If not provided, the folder will be created in the root of the library.
     * @throws If the parent folder does not exist.
     * @throws If there are multiple parent folders with the same uid.
     * @throws If the parent folder is not a folder.
     */
    createFolder = async (
        folderName: string,
        parentFolderUid?: string,
    ) => {

        if (!parentFolderUid) {
            if (this.libPaths.length === 0) throw new Error('No library folder configured.');
            await mkdir(path.resolve(this.libPaths[0]!, folderName), { recursive: true });
            return;
        }

        const parentFolder = this.get(parentFolderUid);

        if (!parentFolder) {
            throw new Error('Folder does not exist.')
        }

        if (Array.isArray(parentFolder)){
            throw new Error('There are multiple folders for that uid.')
        }

        const folderPath = path.resolve(parentFolder.path, folderName);

        await mkdir(path.resolve(folderPath), { recursive: true });

    }

    /**
     * Moves a file to a new folder.
     * @param fileUid The uid of the file to move.
     * @param targetFolderUid The uid of the target folder.
     * @throws If the file does not exist.
     * @throws If the target does not exist.
     * @throws If the target is not a folder.
     */
    moveFile = async (
        fileUid: string,
        targetFolderUid: string,
    ) => {

        const file = this.get(fileUid);

        if (!file || Array.isArray(file)) throw new Error('File not found.');

        const targetPath = targetFolderUid
            ? (() => {
                const targetFolder = this.get(targetFolderUid);
                if (!targetFolder || Array.isArray(targetFolder)) throw new Error('Target folder not found.');
                if (!targetFolder.did) throw new Error('Target is not a folder.');
                return targetFolder.path;
            })()
            : (() => {
                if (this.libPaths.length === 0) throw new Error('No library folder configured.');
                return this.libPaths[0]!;
            })();

        const newPath = path.resolve(targetPath, basename(file.path));
        await rename(file.path, newPath);
        await this.scan();

    }

    /**
     * Deletes a folder and all its contents.
     * @param folderUid The uid of the folder to delete.
     * @throws If the target is not a folder.
     * @throws If the folder does not exist.
     */
    deleteFolder = async (folderUid: string) => {
        const folder = this.get(folderUid);
        if (!folder || Array.isArray(folder)) throw new Error('Folder not found.');
        if (!folder.did) throw new Error('Target is not a folder.');
        await rm(folder.path, { recursive: true, force: true });
        await this.scan();
    }

    /**
     * Deletes a file.
     * @param fileUid The uid of the file to delete.
     * @throws If the target is not a file.
     * @throws If the file does not exist.
     */
    deleteFile = async (fileUid: string) => {
        const file = this.get(fileUid);
        if (!file || Array.isArray(file)) throw new Error('File not found.');
        if (file.did) throw new Error('Target is not a file.');
        await rm(file.path, { force: true });
        await this.scan();
    }

    /**
     * Adds a new library folder and persists it to the preferences store.
     */
    addLibraryPath = async (dir: string) => {
        const resolved = path.resolve(dir);
        if (this.libPaths.includes(resolved)) return;
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
            throw new Error('Folder does not exist.');
        }
        this.libPaths = [...this.libPaths, resolved];
        this.prefsModel.updateAppSettings({ outputDirs: this.libPaths });
        await this.scan();
    }

    /**
     * Removes a library folder and persists the change to the preferences store.
     */
    removeLibraryPath = async (dir: string) => {
        const resolved = path.resolve(dir);
        this.libPaths = this.libPaths.filter(p => p !== resolved);
        this.prefsModel.updateAppSettings({ outputDirs: this.libPaths });
        await this.scan();
    }

    getLibraryPaths = () => this.libPaths;

}
