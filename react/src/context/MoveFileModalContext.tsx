import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useLibraryStore } from '../stores/library.store';

interface IMoveFileModalContextValue {
    isVisible: boolean;
    fileUid: string;
    fileName: string;
    openMoveFileModal: (fileUid: string, fileName: string) => void;
    closeMoveFileModal: () => void;
    selectMoveTarget: (targetFolderUid?: string) => Promise<void>;
}

const MoveFileModalContext = createContext<IMoveFileModalContextValue | null>(null);

export function MoveFileModalProvider({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(false);
    const [fileUid, setFileUid] = useState('');
    const [fileName, setFileName] = useState('');

    const openMoveFileModal = useCallback((openFileUid: string, openFileName: string) => {
        setFileUid(openFileUid);
        setFileName(openFileName);
        setIsVisible(true);
    }, []);

    const closeMoveFileModal = useCallback(() => {
        setIsVisible(false);
    }, []);

    const selectMoveTarget = useCallback(async (targetFolderUid?: string) => {
        closeMoveFileModal();
        await useLibraryStore.getState().moveFile(fileUid, targetFolderUid);
    }, [fileUid, closeMoveFileModal]);

    return (
        <MoveFileModalContext.Provider value={{
            isVisible, fileUid, fileName,
            openMoveFileModal, closeMoveFileModal, selectMoveTarget
        }}>
            {children}
        </MoveFileModalContext.Provider>
    );
}

export function useMoveFileModalContext(): IMoveFileModalContextValue {
    const ctx = useContext(MoveFileModalContext);
    if (!ctx) throw new Error('useMoveFileModalContext must be used within MoveFileModalProvider');
    return ctx;
}
