import { ultraCompState, type IUltraCompStateStateful } from "ultra-light-js";
import { startMetadataScan, pollMetadataScan, getLibraryByMetadata } from "../services/library.service";
import type { ILibraryMetadataGroup, ILibraryMetadataScanProgress, TLibraryGroupMode } from "../library.types";
import { USER_PREF } from "./user-pref-cache.context";
import { toast } from "../services/toast.service";

export interface ILibraryMetadataCtx {
    mode: IUltraCompStateStateful<TLibraryGroupMode>;
    groups: IUltraCompStateStateful<ILibraryMetadataGroup[]>;
    isScanning: IUltraCompStateStateful<boolean>;
    scanProgress: IUltraCompStateStateful<ILibraryMetadataScanProgress | null>;
    init: () => void;
    setMode: (mode: TLibraryGroupMode) => void;
    scanAndLoad: () => Promise<void>;
}

export const LIBRARY_METADATA_CONTEXT: ILibraryMetadataCtx = ultraCompState({

    mode: 'folder' as TLibraryGroupMode,

    groups: [] as ILibraryMetadataGroup[],

    isScanning: false as boolean,

    scanProgress: null as ILibraryMetadataScanProgress | null,

    init: (comp: ILibraryMetadataCtx) => {
        const stored = USER_PREF.getPref('libraryGroupMode');
        if (stored) comp.mode.set(stored);
    },

    setMode: (comp: ILibraryMetadataCtx, mode: TLibraryGroupMode) => {
        comp.mode.set(mode);
        USER_PREF.setPref({ libraryGroupMode: mode });
        comp.groups.set([]);
    },

    scanAndLoad: async (comp: ILibraryMetadataCtx) => {

        const mode = comp.mode.get();
        if (mode === 'folder') return;

        comp.isScanning.set(true);
        comp.scanProgress.set(null);

        try {
            const { jobId } = await startMetadataScan();
            await pollMetadataScan(jobId, (progress) => comp.scanProgress.set(progress));
            const groups = await getLibraryByMetadata(mode);
            comp.groups.set(groups);
            toast.success('Library scanned');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to scan library metadata.');
        } finally {
            comp.isScanning.set(false);
        }

    }

}) as unknown as ILibraryMetadataCtx;
