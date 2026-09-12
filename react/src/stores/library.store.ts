import { create } from 'zustand';
import {
    getLibrary,
    refreshLibrary as requestLibraryRefresh,
    deleteFile as requestDeleteFile,
    deleteFolder as requestDeleteFolder,
    createFolder as requestCreateFolder,
    moveFile as requestMoveFile,
    unidentifyFile as requestUnidentifyFile,
    reidentifyAllLibrary as requestReidentifyAllLibrary
} from '../services/library.service';
import type { ILibraryGroup, ILibraryResponseItem } from '../library.types';
import { toast } from '../services/toast.service';

// React Query's hooks only work inside components, so rather than force a useQuery call
// into this store action, fetchLibrary keeps a lightweight staleTime + in-flight-promise
// cache here instead.
const LIBRARY_STALE_TIME_MS = 60 * 5 * 10000;
let lastFetchedAt = 0;
let inFlight: Promise<void> | null = null;

interface ILibraryStore {
    groups: ILibraryGroup[];
    searchQuery: string;
    /**
     * Holds the uid of the last deleted entry. The /new view (through useRecentlyAdded)
     * reads this to remove that entry from its own list snapshot without an app reload.
     * Each deletion sets a new object, so repeated deletes of the same uid stay distinct
     * and the consuming effect runs again.
     */
    lastDeleted: { uid: string } | null;
    setSearchQuery: (query: string) => void;
    fetchLibrary: () => Promise<void>;
    refreshLibrary: (options?: { silent?: boolean }) => Promise<void>;
    deleteFile: (uid: string) => Promise<void>;
    deleteFolder: (uid: string) => Promise<void>;
    createFolder: (folderName: string, parentFolderUid?: string) => Promise<void>;
    moveFile: (fileUid: string, targetFolderUid?: string) => Promise<void>;
    unidentifyFile: (uid: string) => Promise<void>;
    reidentifyAll: () => Promise<void>;
    getLibraryItems: (args: { onlyDir: boolean, uid?: string }) => ILibraryResponseItem[];
    findUidByPath: (absPath: string) => string | undefined;
}

export const useLibraryStore = create<ILibraryStore>((set, get) => ({

    groups: [],
    searchQuery: '',
    lastDeleted: null,

    setSearchQuery: (searchQuery) => set({ searchQuery }),

    fetchLibrary: async () => {
        const isFresh = Date.now() - lastFetchedAt < LIBRARY_STALE_TIME_MS;
        if (isFresh && !inFlight) return;
        if (!inFlight) {
            inFlight = (async () => {
                const data = await getLibrary();
                lastFetchedAt = Date.now();
                if (get().groups !== data) set({ groups: data });
            })().finally(() => { inFlight = null; });
        }
        await inFlight;
    },

    refreshLibrary: async (options) => {
        try {
            await requestLibraryRefresh();
            lastFetchedAt = 0;
            await get().fetchLibrary();
            if (!options?.silent) toast.success('Library refreshed');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to refresh library.');
        }
    },

    deleteFile: async (uid) => {
        try {
            const data = await requestDeleteFile(uid);
            lastFetchedAt = 0;
            await get().fetchLibrary();
            set({ lastDeleted: { uid } });
            toast.success(data.message || 'File deleted');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete file.');
        }
    },

    deleteFolder: async (uid) => {
        try {
            const data = await requestDeleteFolder(uid);
            lastFetchedAt = 0;
            await get().fetchLibrary();
            set({ lastDeleted: { uid } });
            toast.success(data.message || 'Folder deleted');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete folder.');
        }
    },

    createFolder: async (folderName, parentFolderUid) => {
        try {
            const data = await requestCreateFolder(folderName, parentFolderUid);
            lastFetchedAt = 0;
            await get().fetchLibrary();
            toast.success(data.message || 'Folder created');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to create folder.');
        }
    },

    moveFile: async (fileUid, targetFolderUid) => {
        try {
            const data = await requestMoveFile(fileUid, targetFolderUid);
            lastFetchedAt = 0;
            await get().fetchLibrary();
            toast.success(data.message || 'File moved');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to move file.');
        }
    },

    unidentifyFile: async (uid) => {
        try {
            const data = await requestUnidentifyFile(uid);
            lastFetchedAt = 0;
            await get().fetchLibrary();
            toast.success(data.message || 'File un-identified');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to un-identify file.');
        }
    },

    reidentifyAll: async () => {
        try {
            const data = await requestReidentifyAllLibrary();
            lastFetchedAt = 0;
            await get().fetchLibrary();
            toast.success(data.message || 'Library flagged for re-identification');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to flag library for re-identification.');
        }
    },

    getLibraryItems: ({ onlyDir, uid }) => {

        const groups = get().groups;

        let data: ILibraryResponseItem[];

        const library = uid
            ? groups.find(g => g.uid === uid)
            : undefined;

        if (!uid) {
            data = groups.map(g => g.entries).flat();
        } else if (library) {
            data = library.entries.filter(e => !e.parentId);
        } else {
            data = groups.flatMap(g => g.entries)
            .filter(e => e.parentId === uid);
        }

        if (onlyDir) data = data.filter(i => i.did !== false);

        return data;

    },

    findUidByPath: (absPath) => {

        const groups = get().groups;

        const group = groups.find(g => g.path === absPath);
        if (group) return group.uid;

        for (const g of groups) {
            const entry = g.entries.find(e => e.did && e.path === absPath);
            if (entry) return entry.uid;
        }

        return undefined;

    }

}));
