import { ultraCompState, ultraQuery, type IUltraCompStateStateful } from "ultra-light-js";
import {
    getLibrary,
    refreshLibrary as requestLibraryRefresh,
    deleteFile as requestDeleteFile,
    deleteFolder as requestDeleteFolder,
    createFolder as requestCreateFolder,
    moveFile as requestMoveFile,
    unidentifyFile as requestUnidentifyFile
} from "../services/library.service";
import type { ILibraryGroup, ILibraryResponseItem } from "../library.types";
import { toast } from "../services/toast.service";

const queryClient = ultraQuery();

export interface ILibraryCtx {
    groups: IUltraCompStateStateful<ILibraryGroup[]>;
    queryClient: IUltraCompStateStateful<typeof queryClient>;
    searchQuery: IUltraCompStateStateful<string>;
    fetchLibrary: () => Promise<void>;
    refreshLibrary: () => Promise<void>;
    deleteFile: (uid: string) => Promise<void>;
    deleteFolder: (uid: string) => Promise<void>;
    createFolder: (folderName: string, parentFolderUid?: string) => Promise<void>;
    moveFile: (fileUid: string, targetFolderUid?: string) => Promise<void>;
    unidentifyFile: (uid: string) => Promise<void>;
    getLibraryItems: (args: { onlyDir: boolean, uid?: string }) => ILibraryResponseItem[];
}

export const LIBRARY_CONTEXT: ILibraryCtx = ultraCompState({

    groups: [] as ILibraryGroup[],

    queryClient: queryClient,

    searchQuery: '' as string,

    fetchLibrary: async (comp: ILibraryCtx) => {
        const { data } = await queryClient.fetch(
            'library',
            getLibrary,
            60 * 5 * 10000
        ) as { data: ILibraryGroup[] };
        if (comp.groups.get() !== data) comp.groups.set(data);
    },

    refreshLibrary: async (comp: ILibraryCtx) => {
        try {
            await queryClient.fetch(
                'library-refresh',
                requestLibraryRefresh,
                0
            );
            queryClient.invalidateCache('library-refresh');
            queryClient.invalidateCache('library');
            await comp.fetchLibrary();
            toast.success('Library refreshed');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to refresh library.');
        }
    },

    deleteFile: async (comp: ILibraryCtx, uid: string) => {
        try {
            const data = await requestDeleteFile(uid);
            queryClient.invalidateCache('library');
            await comp.fetchLibrary();
            toast.success(data.message || 'File deleted');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete file.');
        }
    },

    deleteFolder: async (comp: ILibraryCtx, uid: string) => {
        try {
            const data = await requestDeleteFolder(uid);
            queryClient.invalidateCache('library');
            await comp.fetchLibrary();
            toast.success(data.message || 'Folder deleted');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete folder.');
        }
    },

    createFolder: async (comp: ILibraryCtx, folderName: string, parentFolderUid?: string) => {
        try {
            const data = await requestCreateFolder(folderName, parentFolderUid);
            queryClient.invalidateCache('library');
            await comp.fetchLibrary();
            toast.success(data.message || 'Folder created');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to create folder.');
        }
    },

    moveFile: async (comp: ILibraryCtx, fileUid: string, targetFolderUid?: string) => {
        try {
            const data = await requestMoveFile(fileUid, targetFolderUid);
            queryClient.invalidateCache('library');
            await comp.fetchLibrary();
            toast.success(data.message || 'File moved');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to move file.');
        }
    },

    unidentifyFile: async (comp: ILibraryCtx, uid: string) => {
        try {
            const data = await requestUnidentifyFile(uid);
            queryClient.invalidateCache('library');
            await comp.fetchLibrary();
            toast.success(data.message || 'File un-identified');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to un-identify file.');
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
