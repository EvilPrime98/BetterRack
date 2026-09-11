import { ultraCompState, ultraQuery, type IUltraCompStateStateful } from "ultra-light-js";
import {
    getLibraryIndex,
    getLibraryPage,
    LIBRARY_PAGE_SIZE,
    refreshLibrary as requestLibraryRefresh,
    deleteFile as requestDeleteFile,
    deleteFolder as requestDeleteFolder,
    createFolder as requestCreateFolder,
    moveFile as requestMoveFile,
    unidentifyFile as requestUnidentifyFile,
    reidentifyAllLibrary as requestReidentifyAllLibrary
} from "../services/library.service";
import type { ILibraryGroup, ILibraryIndexGroup, ILibraryPage, ILibraryResponseItem } from "../library.types";
import { toast } from "../services/toast.service";

const queryClient = ultraQuery();

const LIBRARY_STALE_TIME = 60 * 5 * 10000;

// Overlapping mounts (sidebar and page) share one load run. Without this guard,
// each mount starts its own pagination sweep.
let libraryLoadInFlight: Promise<void> | null = null;

/** Merge a page of entries into the groups in the store. Keep group order. Do not add an entry twice. */
function mergeLibraryPage(existing: ILibraryGroup[], page: ILibraryPage): ILibraryGroup[] {
    const byUid = new Map<string, ILibraryGroup>(
        existing.map(group => [group.uid, { ...group, entries: [...group.entries] }])
    );
    for (const incoming of page.groups) {
        const current = byUid.get(incoming.uid);
        if (!current) {
            byUid.set(incoming.uid, { ...incoming, entries: [...incoming.entries] });
            continue;
        }
        current.name = incoming.name;
        current.path = incoming.path;
        const seen = new Set(current.entries.map(entry => entry.uid));
        for (const entry of incoming.entries) {
            if (!seen.has(entry.uid)) current.entries.push(entry);
        }
    }
    return [...byUid.values()];
}

async function reloadLibrary(comp: ILibraryCtx) {
    queryClient.invalidateCache('library');
    queryClient.invalidateCache('library-index');
    await comp.fetchLibrary({ force: true });
}

export interface ILibraryCtx {
    groups: IUltraCompStateStateful<ILibraryGroup[]>;
    /** Per-library index (uid, name, entry count). It is set before the entry pages arrive. */
    indexGroups: IUltraCompStateStateful<ILibraryIndexGroup[]>;
    /** False while entry pages still load. True after the whole library is in the store. */
    libraryLoaded: IUltraCompStateStateful<boolean>;
    queryClient: IUltraCompStateStateful<typeof queryClient>;
    searchQuery: IUltraCompStateStateful<string>;
    fetchLibrary: (options?: { force?: boolean }) => Promise<void>;
    refreshLibrary: (options?: { silent?: boolean }) => Promise<void>;
    deleteFile: (uid: string) => Promise<void>;
    deleteFolder: (uid: string) => Promise<void>;
    createFolder: (folderName: string, parentFolderUid?: string) => Promise<void>;
    moveFile: (fileUid: string, targetFolderUid?: string) => Promise<void>;
    unidentifyFile: (uid: string) => Promise<void>;
    reidentifyAll: () => Promise<void>;
    getLibraryItems: (args: { onlyDir: boolean, uid?: string }) => ILibraryResponseItem[];
}

export const LIBRARY_CONTEXT: ILibraryCtx = ultraCompState({

    groups: [] as ILibraryGroup[],

    indexGroups: [] as ILibraryIndexGroup[],

    libraryLoaded: false as boolean,

    queryClient: queryClient,

    searchQuery: '' as string,

    fetchLibrary: async (comp: ILibraryCtx, options?: { force?: boolean }) => {

        if (options?.force) {
            libraryLoadInFlight = null;
            comp.libraryLoaded.set(false);
        }

        if (comp.libraryLoaded.get() && comp.groups.get().length) return;
        if (libraryLoadInFlight) return libraryLoadInFlight;

        libraryLoadInFlight = (async () => {
            try {
                const { data: index } = await queryClient.fetch(
                    'library-index',
                    getLibraryIndex,
                    LIBRARY_STALE_TIME
                ) as { data: ILibraryIndexGroup[] };

                comp.indexGroups.set(index);

                // Build the tree structure from the index first. Then each entry
                // page fills its group when it arrives.
                let merged: ILibraryGroup[] = index.map(group => ({
                    uid: group.uid,
                    name: group.name,
                    path: '',
                    entries: []
                }));
                comp.groups.set([...merged]);

                const { data: firstPage } = await queryClient.fetch(
                    'library',
                    () => getLibraryPage({ offset: 0 }),
                    LIBRARY_STALE_TIME
                ) as { data: ILibraryPage };

                merged = mergeLibraryPage(merged, firstPage);
                comp.groups.set([...merged]);

                const pageSize = firstPage.limit || LIBRARY_PAGE_SIZE;
                let offset = firstPage.offset + pageSize;
                let hasMore = firstPage.hasMore;

                while (hasMore) {
                    const nextPage = await getLibraryPage({ offset, limit: pageSize });
                    merged = mergeLibraryPage(merged, nextPage);
                    comp.groups.set([...merged]);
                    offset = nextPage.offset + pageSize;
                    hasMore = nextPage.hasMore;
                }

                comp.libraryLoaded.set(true);
            } finally {
                libraryLoadInFlight = null;
            }
        })();

        return libraryLoadInFlight;
    },

    refreshLibrary: async (comp: ILibraryCtx, options?: { silent?: boolean }) => {
        try {
            await queryClient.fetch(
                'library-refresh',
                requestLibraryRefresh,
                0
            );
            queryClient.invalidateCache('library-refresh');
            await reloadLibrary(comp);
            if (!options?.silent) toast.success('Library refreshed');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to refresh library.');
        }
    },

    deleteFile: async (comp: ILibraryCtx, uid: string) => {
        try {
            const data = await requestDeleteFile(uid);
            await reloadLibrary(comp);
            toast.success(data.message || 'File deleted');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete file.');
        }
    },

    deleteFolder: async (comp: ILibraryCtx, uid: string) => {
        try {
            const data = await requestDeleteFolder(uid);
            await reloadLibrary(comp);
            toast.success(data.message || 'Folder deleted');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete folder.');
        }
    },

    createFolder: async (comp: ILibraryCtx, folderName: string, parentFolderUid?: string) => {
        try {
            const data = await requestCreateFolder(folderName, parentFolderUid);
            await reloadLibrary(comp);
            toast.success(data.message || 'Folder created');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to create folder.');
        }
    },

    moveFile: async (comp: ILibraryCtx, fileUid: string, targetFolderUid?: string) => {
        try {
            const data = await requestMoveFile(fileUid, targetFolderUid);
            await reloadLibrary(comp);
            toast.success(data.message || 'File moved');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to move file.');
        }
    },

    unidentifyFile: async (comp: ILibraryCtx, uid: string) => {
        try {
            const data = await requestUnidentifyFile(uid);
            await reloadLibrary(comp);
            toast.success(data.message || 'File un-identified');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to un-identify file.');
        }
    },

    reidentifyAll: async (comp: ILibraryCtx) => {
        try {
            const data = await requestReidentifyAllLibrary();
            await reloadLibrary(comp);
            toast.success(data.message || 'Library flagged for re-identification');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to flag library for re-identification.');
        }
    },

    getLibraryItems: (
        comp: ILibraryCtx,
        { onlyDir, uid }: { onlyDir: boolean, uid?: string }
    ): ILibraryResponseItem[] => {

        const groups = comp.groups.get();

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

});
