import path from "node:path";
import { readdir, mkdir, rename, rm, stat } from "node:fs/promises";
import { basename } from "node:path";
import crypto from 'node:crypto';
import type { WikiComic } from "better-wiki";
import type {
    TComicData,
    TComicDataModel,
    TLibraryEntry,
    TLibraryGroup,
    TLibraryPref,
    TPreferencesModel,
    TWikiModel
} from "#src/types.ts";
import fs from "node:fs";
import { logger } from "#utils/logger";
import { createConcurrencyLimiter } from "#utils/concurrencyLimiter";
import { COMIC_EXTENSIONS, IDENTIFY_CONCURRENCY, STAT_CONCURRENCY } from "./constants";

const log = logger.child({ module: 'LibraryModel' });

export class LibraryModel {

    private prefsModel: TPreferencesModel;
    private wikiModel: TWikiModel;
    private comicDataModel: TComicDataModel;
    private libPaths: string[];
    private db: TLibraryEntry[] = [];
    private pref: TLibraryPref[] = [];
    private entryLibraryIndex = new Map<string, number>();
    private entryByUid = new Map<string, TLibraryEntry>();
    private inheritanceCache: TLibraryEntry[] | null = null;
    private identifyInFlight = new Map<string, Promise<TLibraryEntry>>();
    private identifyLimiter = createConcurrencyLimiter(IDENTIFY_CONCURRENCY);
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

    private uidFromPath = (absPath: string) => {
        const hash = crypto.createHash('sha256').update(absPath).digest('hex');
        return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
    };

    private mapWithConcurrency = async <T, R>(
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

    private hydrateComicData = () => {

        const stored = this.comicDataModel.getAll();

        for (const entry of this.db) {
            if (entry.did) continue;
            const existing = stored[entry.uid];
            if (existing?.identified === true) {
                entry.identified = true;
                entry.comic = existing.comic;
            } else if (existing?.identified === false) {
                entry.identified = false;
            }
        }

    };

    private applyStoredComicData = (entry: TLibraryEntry, stored: TComicData) => {
        entry.identified = stored.identified;
        entry.comic = stored.comic;
    };

    private scanInBackground = () => {
        const scanPromise = this.scan();
        scanPromise.catch(e => log.error({ err: e }, 'Background library scan failed'));
        this.ready = scanPromise;
    }

    private loadPreferences = () => {
        this.pref = this.prefsModel.getAllLibraryPrefs();
    }

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

        this.db = await this.mapWithConcurrency(entries, STAT_CONCURRENCY, async ({ entry, libIndex }) => {
            const absPath = path.resolve(entry.parentPath, entry.name);
            const stats = await stat(absPath);
            const uid = this.uidFromPath(absPath);
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
            if (preferences) {
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

        this.hydrateComicData();

    };

    identify = async (uid: string): Promise<TLibraryEntry> => {

        const entry = this.entryByUid.get(uid);
        if (!entry || entry.did) throw new Error('Comic not found.');

        if (entry.identified !== undefined) return entry;

        const stored = this.comicDataModel.getByUid(uid);
        if (stored?.identified !== undefined) {
            this.applyStoredComicData(entry, stored);
            return entry;
        }

        const existing = this.identifyInFlight.get(uid);
        if (existing) return existing;

        const job = (async () => {
            const release = await this.identifyLimiter.acquire();
            try {
                const found = await this.wikiModel.getComic(entry.name);

                const freshlyStored = this.comicDataModel.getByUid(uid);
                if (freshlyStored?.identified !== undefined) {
                    this.applyStoredComicData(entry, freshlyStored);
                    return entry;
                }

                if (found) {
                    this.comicDataModel.upsert(uid, {
                        prefId: found.pageId,
                        sourceWiki: found.sourceWiki,
                        identified: true,
                        comic: found,
                    });
                    entry.identified = true;
                    entry.comic = found;
                } else {
                    this.comicDataModel.upsert(uid, { identified: false });
                    entry.identified = false;
                }
                return entry;
            } catch (e) {
                log.error({ err: e }, 'Failed to identify library entry');
                return entry;
            } finally {
                release();
            }
        })().finally(() => this.identifyInFlight.delete(uid));

        this.identifyInFlight.set(uid, job);

        return job;

    };

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

    get = (uid?: string) => {
        if (!uid) return this.resolveInheritance();
        return this.entryByUid.get(uid);
    }

    getByLibrary = (): TLibraryGroup[] => {
        const resolved = this.resolveInheritance();
        return this.libPaths.map((libPath, libIndex) => ({
            uid: this.uidFromPath(libPath),
            name: basename(libPath),
            path: libPath,
            entries: resolved.filter(entry => this.entryLibraryIndex.get(entry.uid) === libIndex),
        }));
    }

    refresh = async () => {
        this.db = [];
        await this.scan();
    }

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

        if (Array.isArray(parentFolder)) {
            throw new Error('There are multiple folders for that uid.')
        }

        const folderPath = path.resolve(parentFolder.path, folderName);

        await mkdir(path.resolve(folderPath), { recursive: true });

    }

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

    deleteFolder = async (folderUid: string) => {
        const folder = this.get(folderUid);
        if (!folder || Array.isArray(folder)) throw new Error('Folder not found.');
        if (!folder.did) throw new Error('Target is not a folder.');
        await rm(folder.path, { recursive: true, force: true });
        await this.scan();
    }

    deleteFile = async (fileUid: string) => {
        const file = this.get(fileUid);
        if (!file || Array.isArray(file)) throw new Error('File not found.');
        if (file.did) throw new Error('Target is not a file.');
        await rm(file.path, { force: true });
        await this.scan();
    }

    unidentifyFile = async (fileUid: string) => {
        const file = this.get(fileUid);
        if (!file || Array.isArray(file)) throw new Error('File not found.');
        if (file.did) throw new Error('Target is not a file.');

        this.comicDataModel.upsert(fileUid, {
            identified: false,
            comic: undefined,
            sourceWiki: undefined,
            prefId: undefined,
        });

        file.identified = false;
        file.comic = undefined;
        this.inheritanceCache = null;
    }

    commitIdentify = async (fileUid: string, comic: WikiComic) => {
        const file = this.get(fileUid);
        if (!file || Array.isArray(file)) throw new Error('File not found.');
        if (file.did) throw new Error('Target is not a file.');

        this.comicDataModel.upsert(fileUid, {
            identified: true,
            comic,
            sourceWiki: comic.sourceWiki,
            prefId: comic.pageId,
        });

        file.identified = true;
        file.comic = comic;
        this.inheritanceCache = null;
    }

    addLibraryPath = async (dir: string) => {
        const resolved = path.resolve(dir);
        if (this.libPaths.includes(resolved)) return;
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
            throw new Error('Folder does not exist.');
        }
        this.libPaths = [...this.libPaths, resolved];
        this.prefsModel.updateAppSettings({ outputDirs: this.libPaths });
        this.scanInBackground();
    }

    removeLibraryPath = async (dir: string) => {
        const resolved = path.resolve(dir);
        this.libPaths = this.libPaths.filter(p => p !== resolved);
        this.prefsModel.updateAppSettings({ outputDirs: this.libPaths });
        this.scanInBackground();
    }

    getLibraryPaths = () => this.libPaths;

}
