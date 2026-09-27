import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { useLibraryStore } from '../stores/library.store';
import { MoveFileModalContext } from './MoveFileModalContext.hooks';

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

    const value = useMemo(() => ({
        isVisible, fileUid, fileName,
        openMoveFileModal, closeMoveFileModal, selectMoveTarget
    }), [isVisible, fileUid, fileName, openMoveFileModal, closeMoveFileModal, selectMoveTarget]);

    return (
        <MoveFileModalContext.Provider value={value}>
            {children}
        </MoveFileModalContext.Provider>
    );
}
