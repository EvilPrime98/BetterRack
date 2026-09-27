import { useEffect, useRef, useState } from 'react';
import type { WikiComic } from 'better-wiki';
import type { IComicFilters, ILibraryResponseItem } from '@/library.types';
import { useComicIdentStore } from '@/stores/comicIdent.store';
import { identifyLibraryEntry } from '@/services/library.service';

export function useComicIdentification(
    item: ILibraryResponseItem,
    filters: IComicFilters | undefined
) {

    const [comic, setComic] = useState<WikiComic | null>(item.comic ?? null);
    const [metaSource, setMetaSource] = useState(item.metaSource);
    const [identified, setIdentified] = useState(item.identified !== false);
    const [isLoadingInfo, setIsLoadingInfo] = useState(item.identified === undefined);
    const articleRef = useRef<HTMLElement>(null);

    const lastIdentified = useComicIdentStore((s) => s.lastIdentified);
    const lastUnidentified = useComicIdentStore((s) => s.lastUnidentified);

    useEffect(() => {
        if (lastIdentified?.uid !== item.uid) return;
        setComic(lastIdentified.comic);
        setMetaSource(lastIdentified.metaSource);
        setIdentified(true);
        setIsLoadingInfo(false);
    }, [lastIdentified, item.uid]);

    useEffect(() => {
        if (lastUnidentified?.uid !== item.uid) return;
        setComic(null);
        setMetaSource(undefined);
        setIdentified(false);
        setIsLoadingInfo(false);
    }, [lastUnidentified, item.uid]);

    useEffect(() => {

        if (item.identified !== undefined) return undefined;

        if (filters && Object.keys(filters).length > 0) {
            let cancelled = false;
            setIsLoadingInfo(true);
            identifyLibraryEntry(item.uid)
                .then((resolved) => {
                    if (cancelled) return;
                    setComic(resolved.comic ?? null);
                    setMetaSource(resolved.metaSource);
                    setIdentified(resolved.identified === true);
                })
                .catch(() => {})
                .finally(() => {
                    if (!cancelled) setIsLoadingInfo(false);
                });
            return () => { cancelled = true; };
        }

        const node = articleRef.current;
        if (!node) return undefined;

        const observer = new IntersectionObserver((entries) => {
            if (!entries.some(e => e.isIntersecting)) return;
            observer.disconnect();
            setIsLoadingInfo(true);
            identifyLibraryEntry(item.uid)
            .then((resolved) => {
                setComic(resolved.comic ?? null);
                setMetaSource(resolved.metaSource);
                setIdentified(resolved.identified === true);
            })
            .catch(() => {})
            .finally(() => setIsLoadingInfo(false));
        }, { rootMargin: '200px' });

        observer.observe(node);

        return () => observer.disconnect();

    }, [item.uid, item.identified, filters]);

    return { 
        comic, 
        metaSource, 
        identified, 
        isLoadingInfo, 
        articleRef
    };

}
