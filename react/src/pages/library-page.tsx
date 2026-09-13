import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
        window.scrollTo(0, 0);
    }, [uid]);

    useEffect(() => {
        applyFilters();  
    }, [groups, searchQuery, uid]);

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
                    <section className={[styles.comicContainer, comicsType === 'detail' ? styles.detailLayout : ''].filter(Boolean).join(' ')}>
                        {items.map(item => item.did
                            ? <FolderCard key={item.uid} title={item.name} uid={item.uid} />
                            : <ComicCard key={item.uid} item={item} />
                        )}
                    </section>
                )}

            </section>
        </Layout>
    );

}
