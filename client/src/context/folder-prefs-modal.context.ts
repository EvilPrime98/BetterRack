import { ultraCompState, type IUltraCompStateStateful } from "ultra-light-js";
import { getLibraryPref } from "../services/library.service";
import { LIBRARY_CONTEXT } from "./library.context";

export interface IFolderPrefsUpdates {
    prefPublisher: string;
    recursive: boolean;
    prefCover: string;
}

export interface IFolderPrefsModalCtx {
    isVisible: IUltraCompStateStateful<boolean>;
    uid: IUltraCompStateStateful<string>;
    folderName: IUltraCompStateStateful<string>;
    prefPublisher: IUltraCompStateStateful<string>;
    recursive: IUltraCompStateStateful<boolean>;
    prefCover: IUltraCompStateStateful<string>;
    openFolderPrefsModal: (uid: string, folderName: string) => Promise<void>;
    closeFolderPrefsModal: () => void;
    saveFolderPrefs: (updates: IFolderPrefsUpdates) => Promise<void>;
}

export const FOLDER_PREFS_MODAL_CTX: IFolderPrefsModalCtx = ultraCompState({

    isVisible: false,
    uid: '' as string,
    folderName: '' as string,
    prefPublisher: '' as string,
    recursive: false,
    prefCover: '' as string,

    openFolderPrefsModal: async (comp: IFolderPrefsModalCtx, uid: string, folderName: string) => {
        comp.uid.set(uid);
        comp.folderName.set(folderName);
        comp.prefPublisher.set('');
        comp.recursive.set(false);
        comp.prefCover.set('');
        comp.isVisible.set(true);

        const pref = await getLibraryPref(uid);

        if (pref) {
            comp.prefPublisher.set(pref.prefPublisher || '');
            comp.recursive.set(Boolean(pref.recursive));
            comp.prefCover.set(pref.prefCover || '');
        }
    },

    closeFolderPrefsModal: (comp: IFolderPrefsModalCtx) => {
        comp.isVisible.set(false);
    },

    saveFolderPrefs: async (comp: IFolderPrefsModalCtx, updates: IFolderPrefsUpdates) => {
        const uid = comp.uid.get();
        comp.closeFolderPrefsModal();
        await LIBRARY_CONTEXT.updatePreferences(uid, updates);
    }

});
