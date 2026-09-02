import { create } from 'zustand';
import type { WikiComic } from 'better-wiki';

interface IComicIdentStore {
    isVisible: boolean;
    itemUid: string;
    /** Broadcasts a manual identify pick so the originating ComicCard can update immediately. */
    lastIdentified: { uid: string; comic: WikiComic } | null;
    /**
     * Broadcasts an un-identify so the originating ComicCard drops its cached comic without an app reload.
     * A fresh object per un-identify keeps repeated same-uid signals distinct, so the consuming effect re-runs every time.
     */
    lastUnidentified: { uid: string } | null;
    setIsVisible: (isVisible: boolean) => void;
    setItemUid: (itemUid: string) => void;
    setLastIdentified: (value: { uid: string; comic: WikiComic } | null) => void;
    setLastUnidentified: (value: { uid: string } | null) => void;
}

export const useComicIdentStore = create<IComicIdentStore>((set) => ({
    isVisible: false,
    itemUid: '',
    lastIdentified: null,
    lastUnidentified: null,
    setIsVisible: (isVisible) => set({ isVisible }),
    setItemUid: (itemUid) => set({ itemUid }),
    setLastIdentified: (lastIdentified) => set({ lastIdentified }),
    setLastUnidentified: (lastUnidentified) => set({ lastUnidentified }),
}));
