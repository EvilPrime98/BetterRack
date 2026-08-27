import { create } from 'zustand';

const COLLAPSED_KEY = 'better-rack-sidebar-collapsed';

function readCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true';
}

interface ISidebarStore {
    /** Overlay visibility, used below the 800px breakpoint. */
    isExpanded: boolean;
    setIsExpanded: (isExpanded: boolean) => void;
    /** Collapsed-to-zero-width state, used at/above the 800px breakpoint. */
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
}

export const useSidebarStore = create<ISidebarStore>((set) => ({
    isExpanded: false,
    setIsExpanded: (isExpanded) => set({ isExpanded }),
    isCollapsed: readCollapsed(),
    setIsCollapsed: (isCollapsed) => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
        }
        set({ isCollapsed });
    },
}));
