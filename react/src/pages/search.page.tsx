import { useEffect, useRef, useState } from 'react';
import styles from './search-page.module.css';
import { PageHeader } from '@/components/page-header/page-header';
import { useLibraryStore } from '@/stores/library.store';
import { ComicCard } from '@/components/comic-card/comic-card';
import { Layout } from '@/layout';
import { useComicsTypeStore } from '@/stores/comicsTypes.store';
import type { ILibraryResponseItem } from '@/library.types';
import { useFilters } from '@/hooks/useFilters';
import { useDocumentTitleStore } from '@/stores/documentTitle.store';
import { matchesReadFilter, useReadTypesContext } from '@/context/ReadTypesContext';
import { useComicCacheStore } from '@/stores/comicCache.store';

const PAGE_SIZE = 60; //max chunk for pages

export function SearchPage({
    search
}: {
    search: string
}) {

    const groups = useLibraryStore((s) => s.groups);
    const searchQuery = useLibraryStore((s) => s.searchQuery);
    const comicsType = useComicsTypeStore((s) => s.type);
    const setTitle = useDocumentTitleStore((s) => s.setTitle);

    const [items, setItems] = useState<ILibraryResponseItem[]>([]);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const { type: readFilter } = useReadTypesContext();
    const comicCache = useComicCacheStore((s) => s.cache);

    function getSearchItems(): ILibraryResponseItem[] {
        const query = useLibraryStore.getState().searchQuery.trim().toLowerCase();
        return useLibraryStore.getState().getLibraryItems({ onlyDir: false })
        .filter(item => item.did === false)
        .filter(item => item.name.toLowerCase().includes(query));
    }

    const { filters, setFilters, resetFilters, applyFilters } = useFilters({ rawItems: getSearchItems, setItems });

    useEffect(() => {
        if (useLibraryStore.getState().searchQuery !== search) {
            useLibraryStore.setState({ searchQuery: search });
        }
    }, [search]);

    useEffect(() => {
        setTitle(`Search: "${search}"`);
    }, [search, setTitle]);

    useEffect(() => {
        useLibraryStore.getState().fetchLibrary();
        if (useLibraryStore.getState().groups.length) applyFilters();
        
    }, []);

    useEffect(() => {
        applyFilters();
        
    }, [groups, searchQuery]);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [items]);

    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const $sentinel = sentinelRef.current;
        if (!$sentinel) return;
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some(e => e.isIntersecting)) return;
            setVisibleCount((count) => Math.min(count + PAGE_SIZE, items.length));
        }, { rootMargin: '600px' });
        observer.observe($sentinel);
        return () => observer.disconnect();
    }, [items.length]);

    const visibleItems = items.slice(0, visibleCount);
    const hasVisibleItems = items.some(item => matchesReadFilter(readFilter, comicCache[item.uid]?.readPer || 0));

    return (
        <Layout>
            <section className={styles.page}>

                <PageHeader
                    items={items}
                    filters={filters}
                    setFilters={setFilters}
                    resetFilters={resetFilters}
                />

                {!hasVisibleItems ? (
                    <p className={styles.empty}>No items to show.</p>
                ) : (
                    <section className={[styles.comicContainer, comicsType === 'detail' ? styles.detailLayout : ''].filter(Boolean).join(' ')}>
                        {visibleItems.map(item => <ComicCard key={item.uid} item={item} />)}
                        <div className={styles.sentinel} ref={sentinelRef} />
                    </section>
                )}

            </section>
        </Layout>
    );

}
