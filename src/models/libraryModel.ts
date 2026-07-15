import path from "node:path";
import { readdir, mkdir, rename, rm } from "node:fs/promises";
import { basename } from "node:path";
import crypto from 'node:crypto';
import type { TLibraryEntry, TLibraryGroup, TLibraryModel, TLibraryPref } from "#src/types.ts";
import fs, { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";

export class LibraryModel implements TLibraryModel {

    private libPaths: string[];
    private db: TLibraryEntry[] = [];
    private pref: TLibraryPref[] = [];
    private entryLibraryIndex = new Map<string, number>();

    constructor(libPath: string | string[]) {
        const paths = Array.isArray(libPath) ? libPath : libPath.split(',');
        this.libPaths = paths.map(p => p.trim()).filter(Boolean).map(p => path.resolve(p));
        if (this.libPaths.length === 0) throw new Error('Output directory not defined');
        this.init()
    }

    private init = async () => {
        await this.setPreferences();
        await this.scan();
    }

    /**
     * Scans the library for entries and populates the "db" property.
     */
    scan = async () => {

        const entries = (await Promise.all(
            this.libPaths.map(async (libPath, libIndex) => {
                const dirEntries = await readdir(libPath, { withFileTypes: true, recursive: true });
                return dirEntries.map(entry => ({ entry, libIndex }));
            })
        )).flat();

        this.entryLibraryIndex = new Map();

        this.db = entries.map(({ entry, libIndex }) => {
            const stats = fs.statSync(path.resolve(entry.parentPath, entry.name));
            const absPath = path.resolve(entry.parentPath, entry.name);
            const hash = crypto.createHash('sha256').update(absPath).digest('hex');
            const uid = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
            const returnable: TLibraryEntry = {
                uid,
                did: entry.isDirectory(),
                name: basename(entry.name),
                path: path.resolve(entry.parentPath, entry.name),
                parentId: undefined as string | undefined,
                createdAt: stats.mtimeMs,
            }
            this.entryLibraryIndex.set(uid, libIndex);
            const preferences = this.pref.find(pref => pref.uid === uid);
            if (preferences){
                returnable.prefPublisher = preferences.prefPublisher;
                returnable.prefInheritance = preferences.recursive;
                returnable.prefCover = preferences.prefCover;
            }
            return returnable;
        });

        this.db.forEach((entry, index) => {
            const parentPath = path.resolve(entries[index].entry.parentPath);
            entry.parentId = this.db.find(e => e.path === parentPath)?.uid;
        });

        this.db.sort((a, b) => {
            if (a.did !== b.did) return a.did ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

    };

    setPreferences = async () => {
        const filePath = process.env['LIB_PREFERENCES'];
        if (!filePath) return;
        if (!existsSync(filePath)) await writeFile('library-pref.json', '');
        const content = await readFile(filePath, { encoding: 'utf-8'});
        this.pref = JSON.parse(content);
    }

    getPreferences = (uid: string) => {
        return this.pref.find(pref => pref.uid === uid);
    }

    updatePreferences = async (uid: string, updates: Partial<Omit<TLibraryPref, 'uid'>>) => {
        const existing = this.pref.find(p => p.uid === uid);
        if (existing) {
            Object.assign(existing, updates);
        } else {
            this.pref.push({ uid, prefPublisher: '', recursive: false, prefCover: '', ...updates });
        }
        const dbEntry = this.db.find(e => e.uid === uid);
        if (dbEntry) {
            const updated = this.pref.find(p => p.uid === uid)!;
            dbEntry.prefPublisher = updated.prefPublisher;
            dbEntry.prefInheritance = updated.recursive;
            dbEntry.prefCover = updated.prefCover;
        }
        const filePath = process.env['LIB_PREFERENCES'];
        if (filePath) {
            await writeFile(filePath, JSON.stringify(this.pref, null, 2));
        }
    }

    private resolveInheritance = (entries: TLibraryEntry[]): TLibraryEntry[] => {
        return entries.map(entry => {
            if (entry.prefPublisher) return entry;
            let parentId = entry.parentId;
            while (parentId) {
                const parent = entries.find(e => e.uid === parentId);
                if (!parent) break;
                if (parent.prefInheritance && parent.prefPublisher) {
                    return { ...entry, prefPublisher: parent.prefPublisher };
                }
                parentId = parent.parentId;
            }
            return entry;
        });
    }

    /**
     * Returns the entry with the given uid.
     * @param uid The uid of the entry to get.
     * @returns The entry with the given uid.
     */
    get = (uid?: string) => {
        if (!uid) return this.resolveInheritance(this.db);
        return this.db.find(entry => entry.uid === uid);
    }

    /**
     * Returns the library entries grouped per configured library (OUTPUT_DIR).
     */
    getByLibrary = (): TLibraryGroup[] => {
        const resolved = this.resolveInheritance(this.db);
        return this.libPaths.map((libPath, libIndex) => {
            const hash = crypto.createHash('sha256').update(libPath).digest('hex');
            const uid = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
            return {
                uid,
                name: basename(libPath),
                path: libPath,
                entries: resolved.filter(entry => this.entryLibraryIndex.get(entry.uid) === libIndex),
            };
        });
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
            await mkdir(path.resolve(this.libPaths[0], folderName), { recursive: true });
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
            : this.libPaths[0];

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

}