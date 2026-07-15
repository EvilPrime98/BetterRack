import { ultraCompState, type IUltraCompStateStateful } from "ultra-light.js";
import type { IComicLSCache } from "../library.types";

export interface IComicCacheCtx {
    keyName: IUltraCompStateStateful<string>;
    cache: IUltraCompStateStateful<Record<string, IComicLSCache>>;
    compile: () => void;
    init: () => void;
    getCacheById: (uid: string) => IComicLSCache;
    setCacheById: (uid: string, pref: Partial<IComicLSCache>) => void;
}

export const COMIC_CACHE_CONTEXT: IComicCacheCtx = ultraCompState({

    keyName: 'comic-rack-cache',

    cache: {} as Record<string, IComicLSCache>,

    compile: (comp: IComicCacheCtx) => {
        window.localStorage.setItem(comp.keyName.get(), JSON.stringify(comp.cache.get()));
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
        const currCache = structuredClone(comp.cache.get());
        currCache[uid] = { ...currCache[uid], ...pref };
        comp.cache.set(currCache);
        comp.compile();
    }

});