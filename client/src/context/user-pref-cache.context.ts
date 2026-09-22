import { ultraCompState, type IUltraCompStateStateful } from "ultra-light-js";
import type { TComicsTypes, TFilterOptions } from "../library.types";

export interface IUserPref {
    filter: TFilterOptions,
    comicType: TComicsTypes;
    /** Whether or not to show a confirmation modal when stopping a download job. */
    askStopDownloads: boolean;
    zoom: number;
}

export interface IUserPrefCtx {
    keyName: IUltraCompStateStateful<string>;
    pref: IUltraCompStateStateful<IUserPref>;
    compile: () => void;
    init: () => void;
    getPref: <K extends keyof IUserPref>(prefKey: K) => IUserPref[K];
    setPref: (pref: Partial<IUserPref>) => void;
}

const DEFAULT_PREF: IUserPref = {
    filter: 'Alphabetically',
    comicType: 'detail',
    askStopDownloads: true,
    zoom: 1
}

export const USER_PREF = ultraCompState({

    keyName: 'better-rack-user-pref',

    pref: DEFAULT_PREF,

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
            comp.pref.set({ ...DEFAULT_PREF, ...JSON.parse(lsCache) });
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