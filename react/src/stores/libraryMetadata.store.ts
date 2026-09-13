import { create } from 'zustand';
import { startMetadataScan, pollMetadataScan, getLibraryByMetadata } from '../services/library.service';
import type { ILibraryMetadataGroup, ILibraryMetadataScanProgress, TLibraryGroupMode } from '../library.types';
import { useUserPrefStore } from './userPref.store';
import { toast } from '../services/toast.service';

interface ILibraryMetadataStore {
    mode: TLibraryGroupMode;
    groups: ILibraryMetadataGroup[];
    isScanning: boolean;
    scanProgress: ILibraryMetadataScanProgress | null;
    init: () => void;
    setMode: (mode: TLibraryGroupMode) => void;
    scanAndLoad: () => Promise<void>;
}

export const useLibraryMetadataStore = create<ILibraryMetadataStore>((set, get) => ({

    mode: 'folder',
    groups: [],
    isScanning: false,
    scanProgress: null,

    init: () => {
        const stored = useUserPrefStore.getState().getPref('libraryGroupMode');
        if (stored) set({ mode: stored });
    },

    setMode: (mode) => {
        set({ mode, groups: [] });
        useUserPrefStore.getState().setPref({ libraryGroupMode: mode });
    },

    scanAndLoad: async () => {

        const mode = get().mode;
        if (mode === 'folder') return;

        set({ isScanning: true, scanProgress: null });

        try {
            const { jobId } = await startMetadataScan();
            await pollMetadataScan(jobId, (progress) => set({ scanProgress: progress }));
            const groups = await getLibraryByMetadata(mode);
            set({ groups });
            toast.success('Library scanned');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to scan library metadata.');
        } finally {
            set({ isScanning: false });
        }

    }

}));
