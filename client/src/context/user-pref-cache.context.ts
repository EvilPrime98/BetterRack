import { ultraCompState, type IUltraCompStateStateful } from "ultra-light-js";
import type { TComicsTypes, TFilterOptions, TReaderLayoutMode } from "../library.types";

export interface IUserPref {
    filter: TFilterOptions,
    comicType: TComicsTypes;
    readerLayout: TReaderLayoutMode;
}

export interface IUserPrefCtx {
    keyName: IUltraCompStateStateful<string>;
    pref: IUltraCompStateStateful<IUserPref>;
    compile: () => void;
    init: () => void;
    getPref: <K extends keyof IUserPref>(prefKey: K) => IUserPref[K];
    setPref: (pref: Partial<IUserPref>) => void;
}

export const USER_PREF = ultraCompState({

    keyName: 'better-rack-user-pref',

    pref: {} as IUserPref,

    compile: (comp: IUserPrefCtx) => {
        window.localStorage.setItem(
            comp.keyName.get(),
            JSON.stringify(comp.pref.get())
        );
    },

    init: (comp: IUserPrefCtx) => {
        const lsCache = window.localStorage.getItem(comp.keyName.get());
        if (!lsCache) {
            comp.compile();
        } else {
            comp.pref.set(JSON.parse(lsCache));
        }
    },

    getPref: <K extends keyof IUserPref>(
        comp: IUserPrefCtx,
        prefKey: K
    ): IUserPref[K] => {
        return comp.pref.get()[prefKey];
    },

    setPref: (
        comp: IUserPrefCtx, 
        pref: Partial<IUserPref>
    ) => {
        const currPref = structuredClone(comp.pref.get());
        Object.assign(currPref, pref);
        comp.pref.set(currPref);
        comp.compile();
    }

}) as unknown as IUserPrefCtx;