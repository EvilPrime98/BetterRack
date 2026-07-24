import { ultraCompState, type IUltraCompStateStateful } from "ultra-light-js";
import type { IComicLSCache } from "../library.types";

const PERSIST_DEBOUNCE_MS = 400;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export interface IComicCacheCtx {
    keyName: IUltraCompStateStateful<string>;
    cache: IUltraCompStateStateful<Record<string, IComicLSCache>>;
    compile: () => void;
    init: () => void;
    getCacheById: (uid: string) => IComicLSCache | undefined;
    setCacheById: (uid: string, pref: Partial<IComicLSCache>) => void;
    subscribeById: (uid: string, fn: (entry: IComicLSCache | undefined) => void) => () => void;
}

export const COMIC_CACHE_CONTEXT: IComicCacheCtx = ultraCompState({

    keyName: 'better-rack-cache',

    cache: {} as Record<string, IComicLSCache>,

    // Debounced: cache.set() below already updates reactive state synchronously,
    // this only batches the localStorage write for bursts of updates (e.g. reader scroll).
    compile: (comp: IComicCacheCtx) => {
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(() => {
            window.localStorage.setItem(comp.keyName.get(), JSON.stringify(comp.cache.get()));
            persistTimer = null;
        }, PERSIST_DEBOUNCE_MS);
    },

    init: (comp: IComicCacheCtx) => {
        const lsCache = window.localStorage.getItem(comp.keyName.get());
        if (!lsCache) {
            comp.compile();
        } else {
            comp.cache.set(JSON.parse(lsCache));
        }
    },

    getCacheById: (comp: IComicCacheCtx, uid: string) => {
        return (comp.cache.get() as Record<string, IComicLSCache>)[uid];
    },

    setCacheById: (comp: IComicCacheCtx, uid: string, pref: Partial<IComicLSCache>) => {
        // Shallow copy: keeps object identity for every untouched uid, so
        // subscribeById can diff with a cheap reference check instead of deep equality.
        const currCache = { ...comp.cache.get() };
        currCache[uid] = { ...currCache[uid], ...pref };
        comp.cache.set(currCache);
        comp.compile();
    },

    subscribeById: (comp: IComicCacheCtx, uid: string, fn: (entry: IComicLSCache | undefined) => void) => {
        let lastEntry = comp.cache.get()[uid];
        return comp.cache.subscribe((cache) => {
            const entry = cache[uid];
            if (entry === lastEntry) return;
            lastEntry = entry;
            fn(entry);
        });
    }

});