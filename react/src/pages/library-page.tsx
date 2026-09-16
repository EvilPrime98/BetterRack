import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { createSwapy, type Swapy } from 'swapy';
import styles from './library-page.module.css';
import { PageHeader } from '@/components/page-header/page-header';
import { useLibraryStore } from '@/stores/library.store';
import { FolderCard } from '@/components/folder-card/folder-card';
import { ComicCard } from '@/components/comic-card/comic-card';
import { Layout } from '@/layout';
import { useComicsTypeStore } from '@/stores/comicsTypes.store';
import type { ILibraryResponseItem } from '@/library.types';
import { useFilters } from '@/hooks/useFilters';
import { SearchPage } from './search.page';
import { useDocumentTitleStore } from '@/stores/documentTitle.store';
import { matchesReadFilter, useReadTypesContext } from '@/context/ReadTypesContext';
import { useComicCacheStore } from '@/stores/comicCache.store';

export function LibraryPage() {

    const { uid } = useParams<{ uid?: string }>();
    const [searchParams] = useSearchParams();
    const search = searchParams.get('search');
    const groups = useLibraryStore((s) => s.groups);
    const searchQuery = useLibraryStore((s) => s.searchQuery);
    const comicsType = useComicsTypeStore((s) => s.type);
    const setTitle = useDocumentTitleStore((s) => s.setTitle);
    const [items, setItems] = useState<ILibraryResponseItem[]>([]);
    const comicContainerRef = useRef<HTMLElement>(null);
    const swapyRef = useRef<Swapy | null>(null);
    const { filters, setFilters, resetFilters, applyFilters } = useFilters({ rawItems: getLibraryItems, setItems });
    const { type: readFilter } = useReadTypesContext();
    const comicCache = useComicCacheStore((s) => s.cache);

    function getLibraryItems(): ILibraryResponseItem[] {
        const items = useLibraryStore.getState().getLibraryItems({ onlyDir: !uid, uid });
        const query = useLibraryStore.getState().searchQuery.trim().toLowerCase();
        if (!query) return items;
        return items.filter(item => item.name.toLowerCase().includes(query));
    }

    const hasVisibleItems = items.some(item => item.did
        || matchesReadFilter(readFilter, comicCache[item.uid]?.readPer || 0));

    useEffect(() => {
        setTitle('Library');
    }, [setTitle]);

    useEffect(() => {
        useLibraryStore.getState().fetchLibrary();
        if (useLibraryStore.getState().groups.length) applyFilters();
        comicContainerRef.current?.scrollTo(0, 0);
    }, [uid]);

    useEffect(() => {
        applyFilters();
    }, [groups, searchQuery, uid]);

    useEffect(() => {
        if (!hasVisibleItems || !comicContainerRef.current) return;
        swapyRef.current = createSwapy(comicContainerRef.current, { animation: 'dynamic' });
        return () => {
            swapyRef.current?.destroy();
            swapyRef.current = null;
        };
    }, [hasVisibleItems]);

    useEffect(() => {
        swapyRef.current?.update();
    }, [items]);

    if (search) {
        return <SearchPage search={search} />;
    }

    return (
        <Layout>
            <section className={styles.page}>

                <PageHeader
                    filters={filters}
                    uid={uid}
                    items={items}
                    setFilters={setFilters}
                    resetFilters={resetFilters}
                    showNewFolder
                />

                {!hasVisibleItems ? (
                    <p className={styles.empty}>No items to show.</p>
                ) : (
                    <section
                        ref={comicContainerRef}
                        className={[styles.comicContainer, comicsType === 'detail' ? styles.detailLayout : ''].filter(Boolean).join(' ')}
                    >
                        {items.map(item => (
                            <div key={item.uid} data-swapy-slot={item.uid}>
                                <div data-swapy-item={item.uid} onDragStart={(e) => e.preventDefault()}>
                                    {item.did
                                        ? <FolderCard title={item.name} uid={item.uid} />
                                        : <ComicCard item={item} />
                                    }
                                </div>
                            </div>
                        ))}
                    </section>
                )}

            </section>
        </Layout>
    );

}
