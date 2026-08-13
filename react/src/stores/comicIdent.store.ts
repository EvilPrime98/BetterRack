import { create } from 'zustand';
import type { WikiComic } from 'better-wiki';

interface IComicIdentStore {
    isVisible: boolean;
    itemUid: string;
    /** Broadcasts a manual identify pick so the originating ComicCard can update immediately. */
    lastIdentified: { uid: string; comic: WikiComic } | null;
    setIsVisible: (isVisible: boolean) => void;
    setItemUid: (itemUid: string) => void;
    setLastIdentified: (value: { uid: string; comic: WikiComic } | null) => void;
}

export const useComicIdentStore = create<IComicIdentStore>((set) => ({
    isVisible: false,
    itemUid: '',
    lastIdentified: null,
    setIsVisible: (isVisible) => set({ isVisible }),
    setItemUid: (itemUid) => set({ itemUid }),
    setLastIdentified: (lastIdentified) => set({ lastIdentified }),
}));
