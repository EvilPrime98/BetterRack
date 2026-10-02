import { useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { DownloadDirModalContext } from './DownloadDirModalContext.hooks';

export function DownloadDirModalProvider({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(false);
    const [itemTitle, setItemTitle] = useState('');
    const pendingResolve = useRef<((dir: string | null) => void) | null>(null);

    const settle = useCallback((dir: string | null) => {
        const resolve = pendingResolve.current;
        pendingResolve.current = null;
        resolve?.(dir);
    }, []);

    const openDownloadDirModal = useCallback((title: string) => {
        settle(null);
        setItemTitle(title);
        setIsVisible(true);
        return new Promise<string | null>((resolve) => {
            pendingResolve.current = resolve;
        });
    }, [settle]);

    const confirmDownloadDir = useCallback((dir: string) => {
        setIsVisible(false);
        settle(dir);
    }, [settle]);

    const closeDownloadDirModal = useCallback(() => {
        setIsVisible(false);
        settle(null);
    }, [settle]);

    const value = useMemo(() => ({
        isVisible, itemTitle,
        openDownloadDirModal, confirmDownloadDir, closeDownloadDirModal
    }), [isVisible, itemTitle, openDownloadDirModal, confirmDownloadDir, closeDownloadDirModal]);

    return (
        <DownloadDirModalContext.Provider value={value}>
            {children}
        </DownloadDirModalContext.Provider>
    );
}
