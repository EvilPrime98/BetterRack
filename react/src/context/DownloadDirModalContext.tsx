import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

interface IDownloadDirModalContextValue {
    isVisible: boolean;
    itemTitle: string;
    openDownloadDirModal: (itemTitle: string) => Promise<string | null>;
    confirmDownloadDir: (dir: string) => void;
    closeDownloadDirModal: () => void;
}

const DownloadDirModalContext = createContext<IDownloadDirModalContextValue | null>(null);

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

    return (
        <DownloadDirModalContext.Provider value={{
            isVisible, itemTitle,
            openDownloadDirModal, confirmDownloadDir, closeDownloadDirModal
        }}>
            {children}
        </DownloadDirModalContext.Provider>
    );
}

export function useDownloadDirModalContext(): IDownloadDirModalContextValue {
    const ctx = useContext(DownloadDirModalContext);
    if (!ctx) throw new Error('useDownloadDirModalContext must be used within DownloadDirModalProvider');
    return ctx;
}
