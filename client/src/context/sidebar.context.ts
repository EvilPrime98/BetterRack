import { ultraCompState } from "ultra-light-js";

const COLLAPSED_KEY = 'better-rack-sidebar-collapsed';

function readCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true';
}

export const SIDEBAR_CONTEXT = ultraCompState({
    isExpanded: false,
    isCollapsed: readCollapsed()
})

SIDEBAR_CONTEXT.isCollapsed.subscribe(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLLAPSED_KEY, String(SIDEBAR_CONTEXT.isCollapsed.get()));
});
