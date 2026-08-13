import { create } from 'zustand';
import {
    getLibrary,
    refreshLibrary as requestLibraryRefresh,
    deleteFile as requestDeleteFile,
    deleteFolder as requestDeleteFolder,
    createFolder as requestCreateFolder,
    moveFile as requestMoveFile,
    unidentifyFile as requestUnidentifyFile,
    updateLibraryPref as requestUpdateLibraryPref
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
    setSearchQuery: (query: string) => void;
    fetchLibrary: () => Promise<void>;
    refreshLibrary: () => Promise<void>;
    deleteFile: (uid: string) => Promise<void>;
    deleteFolder: (uid: string) => Promise<void>;
    createFolder: (folderName: string, parentFolderUid?: string) => Promise<void>;
    moveFile: (fileUid: string, targetFolderUid?: string) => Promise<void>;
    unidentifyFile: (uid: string) => Promise<void>;
    updatePreferences: (uid: string, updates: Partial<{ prefPublisher: string; recursive: boolean; prefCover: string }>) => Promise<void>;
    getLibraryItems: (args: { onlyDir: boolean, uid?: string }) => ILibraryResponseItem[];
}

export const useLibraryStore = create<ILibraryStore>((set, get) => ({

    groups: [],
    searchQuery: '',

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

    refreshLibrary: async () => {
        try {
            await requestLibraryRefresh();
            lastFetchedAt = 0;
            await get().fetchLibrary();
            toast.success('Library refreshed');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to refresh library.');
        }
    },

    deleteFile: async (uid) => {
        try {
            const data = await requestDeleteFile(uid);
            lastFetchedAt = 0;
            await get().fetchLibrary();
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

    updatePreferences: async (uid, updates) => {
        try {
            const data = await requestUpdateLibraryPref(uid, updates);
            lastFetchedAt = 0;
            await get().fetchLibrary();
            toast.success(data.message || 'Preferences updated');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to update preferences.');
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

    }

}));
