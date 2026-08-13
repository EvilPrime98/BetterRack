import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getLibraryPref } from '../services/library.service';
import { useLibraryStore } from '../stores/library.store';

export interface IFolderPrefsUpdates {
    prefPublisher: string;
    recursive: boolean;
    prefCover: string;
}

interface IFolderPrefsModalContextValue {
    isVisible: boolean;
    uid: string;
    folderName: string;
    prefPublisher: string;
    recursive: boolean;
    prefCover: string;
    openFolderPrefsModal: (uid: string, folderName: string) => Promise<void>;
    closeFolderPrefsModal: () => void;
    saveFolderPrefs: (updates: IFolderPrefsUpdates) => Promise<void>;
}

const FolderPrefsModalContext = createContext<IFolderPrefsModalContextValue | null>(null);

export function FolderPrefsModalProvider({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(false);
    const [uid, setUid] = useState('');
    const [folderName, setFolderName] = useState('');
    const [prefPublisher, setPrefPublisher] = useState('');
    const [recursive, setRecursive] = useState(false);
    const [prefCover, setPrefCover] = useState('');

    const closeFolderPrefsModal = useCallback(() => {
        setIsVisible(false);
    }, []);

    const openFolderPrefsModal = useCallback(async (openUid: string, openFolderName: string) => {
        setUid(openUid);
        setFolderName(openFolderName);
        setPrefPublisher('');
        setRecursive(false);
        setPrefCover('');
        setIsVisible(true);

        const pref = await getLibraryPref(openUid);

        if (pref) {
            setPrefPublisher(pref.prefPublisher || '');
            setRecursive(Boolean(pref.recursive));
            setPrefCover(pref.prefCover || '');
        }
    }, []);

    const saveFolderPrefs = useCallback(async (updates: IFolderPrefsUpdates) => {
        closeFolderPrefsModal();
        await useLibraryStore.getState().updatePreferences(uid, updates);
    }, [uid, closeFolderPrefsModal]);

    return (
        <FolderPrefsModalContext.Provider value={{
            isVisible, uid, folderName, prefPublisher, recursive, prefCover,
            openFolderPrefsModal, closeFolderPrefsModal, saveFolderPrefs
        }}>
            {children}
        </FolderPrefsModalContext.Provider>
    );
}

export function useFolderPrefsModalContext(): IFolderPrefsModalContextValue {
    const ctx = useContext(FolderPrefsModalContext);
    if (!ctx) throw new Error('useFolderPrefsModalContext must be used within FolderPrefsModalProvider');
    return ctx;
}
