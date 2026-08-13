import { create } from 'zustand';

interface ISidebarStore {
    isExpanded: boolean;
    setIsExpanded: (isExpanded: boolean) => void;
}

export const useSidebarStore = create<ISidebarStore>((set) => ({
    isExpanded: false,
    setIsExpanded: (isExpanded) => set({ isExpanded }),
}));
