import { create } from 'zustand';
import type { TComicsTypes, TFilterOptions } from '../library.types';

export interface IUserPref {
    filter: TFilterOptions;
    comicType: TComicsTypes;
}

interface IUserPrefStore {
    keyName: string;
    pref: IUserPref;
    compile: () => void;
    init: () => void;
    getPref: <K extends keyof IUserPref>(prefKey: K) => IUserPref[K];
    setPref: (pref: Partial<IUserPref>) => void;
}

export const useUserPrefStore = create<IUserPrefStore>((set, get) => ({

    keyName: 'better-rack-user-pref',

    pref: {} as IUserPref,

    compile: () => {
        window.localStorage.setItem(
            get().keyName,
            JSON.stringify(get().pref)
        );
    },

    init: () => {
        const lsCache = window.localStorage.getItem(get().keyName);
        if (!lsCache) {
            get().compile();
        } else {
            set({ pref: JSON.parse(lsCache) });
        }
    },

    getPref: (prefKey) => get().pref[prefKey],

    setPref: (pref) => {
        const currPref = structuredClone(get().pref);
        Object.assign(currPref, pref);
        set({ pref: currPref });
        get().compile();
    }

}));
