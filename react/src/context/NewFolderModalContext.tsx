import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { useLibraryStore } from '../stores/library.store';

interface INewFolderModalContextValue {
    isVisible: boolean;
    parentFolderUid: string | undefined;
    openNewFolderModal: (parentFolderUid?: string) => void;
    closeNewFolderModal: () => void;
    submitNewFolder: (folderName: string) => Promise<void>;
}

const NewFolderModalContext = createContext<INewFolderModalContextValue | null>(null);

export function NewFolderModalProvider({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(false);
    const [parentFolderUid, setParentFolderUid] = useState<string | undefined>(undefined);
    const parentFolderUidRef = useRef<string | undefined>(undefined);

    const openNewFolderModal = useCallback((uid?: string) => {
        parentFolderUidRef.current = uid;
        setParentFolderUid(uid);
        setIsVisible(true);
    }, []);

    const closeNewFolderModal = useCallback(() => {
        setIsVisible(false);
    }, []);

    const submitNewFolder = useCallback(async (folderName: string) => {
        const trimmed = folderName.trim();
        if (!trimmed) return;
        closeNewFolderModal();
        await useLibraryStore.getState().createFolder(trimmed, parentFolderUidRef.current);
    }, [closeNewFolderModal]);

    return (
        <NewFolderModalContext.Provider value={{
            isVisible, parentFolderUid,
            openNewFolderModal, closeNewFolderModal, submitNewFolder
        }}>
            {children}
        </NewFolderModalContext.Provider>
    );
}

export function useNewFolderModalContext(): INewFolderModalContextValue {
    const ctx = useContext(NewFolderModalContext);
    if (!ctx) throw new Error('useNewFolderModalContext must be used within NewFolderModalProvider');
    return ctx;
}
