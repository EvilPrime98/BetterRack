import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { IStoreLink } from '@/store.types';

interface ILinkPickerModalContextValue {
    isVisible: boolean;
    comicTitle: string;
    links: IStoreLink[];
    openLinkPickerModal: (links: IStoreLink[], comicTitle: string) => Promise<IStoreLink | null>;
    pickLink: (link: IStoreLink) => void;
    closeLinkPickerModal: () => void;
}

const LinkPickerModalContext = createContext<ILinkPickerModalContextValue | null>(null);

export function LinkPickerModalProvider({ children }: { children: ReactNode }) {
    const [isVisible, setIsVisible] = useState(false);
    const [comicTitle, setComicTitle] = useState('');
    const [links, setLinks] = useState<IStoreLink[]>([]);
    const pendingResolve = useRef<((link: IStoreLink | null) => void) | null>(null);

    const settle = useCallback((link: IStoreLink | null) => {
        const resolve = pendingResolve.current;
        pendingResolve.current = null;
        resolve?.(link);
    }, []);

    const openLinkPickerModal = useCallback((nextLinks: IStoreLink[], title: string) => {
        settle(null);
        setLinks(nextLinks);
        setComicTitle(title);
        setIsVisible(true);
        return new Promise<IStoreLink | null>((resolve) => {
            pendingResolve.current = resolve;
        });
    }, [settle]);

    const pickLink = useCallback((link: IStoreLink) => {
        setIsVisible(false);
        settle(link);
    }, [settle]);

    const closeLinkPickerModal = useCallback(() => {
        setIsVisible(false);
        settle(null);
    }, [settle]);

    return (
        <LinkPickerModalContext.Provider value={{
            isVisible, comicTitle, links,
            openLinkPickerModal, pickLink, closeLinkPickerModal
        }}>
            {children}
        </LinkPickerModalContext.Provider>
    );
}

export function useLinkPickerModalContext(): ILinkPickerModalContextValue {
    const ctx = useContext(LinkPickerModalContext);
    if (!ctx) throw new Error('useLinkPickerModalContext must be used within LinkPickerModalProvider');
    return ctx;
}
