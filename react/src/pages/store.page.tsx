import { useEffect, useRef, useState } from 'react';
import styles from './store.page.module.css';
import { Layout } from '@/layout';
import { StoreCard } from '@/components/store-card/store-card';
import { searchComics, getLatestComics } from '@/services/store.service';
import { toast } from '@/services/toast.service';
import type { IStorePost } from '@/store.types';
import { useDocumentTitleStore } from '@/stores/documentTitle.store';

const PAGE_SIZE = 30;

function keyFor(item: IStorePost) {
    return item.id !== undefined ? `id:${item.id}` : `link:${item.link}`;
}

export function StorePage() {

    const setTitle = useDocumentTitleStore((s) => s.setTitle);

    const [query, setQuery] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [results, setResults] = useState<IStorePost[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState('');

    const stateRef = useRef({ hasMore, isLoading, isLoadingMore, page, activeSearch });
    useEffect(() => {
        stateRef.current = { hasMore, isLoading, isLoadingMore, page, activeSearch };
    });

    async function fetchPage(pageNum: number, term: string): Promise<IStorePost[]> {
        return term
            ? searchComics({ search: term, page: pageNum, perPage: PAGE_SIZE })
            : getLatestComics({ page: pageNum, perPage: PAGE_SIZE });
    }

    async function loadFirstPage(term: string) {
        setIsLoading(true);
        setError('');
        try {
            const items = await fetchPage(1, term);
            setResults(items);
            setPage(1);
            setHasMore(items.length === PAGE_SIZE);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to load comics.';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    async function loadMore() {
        const s = stateRef.current;
        if (!s.hasMore || s.isLoading || s.isLoadingMore) return;
        const nextPage = s.page + 1;
        setIsLoadingMore(true);
        try {
            const items = await fetchPage(nextPage, s.activeSearch);
            setResults((prev) => [...prev, ...items]);
            setPage(nextPage);
            setHasMore(items.length === PAGE_SIZE);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to load more comics.';
            toast.error(message);
        } finally {
            setIsLoadingMore(false);
        }
    }

    function runSearch() {
        const term = query.trim();
        setActiveSearch(term);
        loadFirstPage(term);
    }

    useEffect(() => {
        setTitle('Store');
        loadFirstPage('');
        
    }, []);

    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const $sentinel = sentinelRef.current;
        if (!$sentinel) return;
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some(e => e.isIntersecting)) return;
            loadMore();
        }, { rootMargin: '600px' });
        observer.observe($sentinel);
        return () => observer.disconnect();
        
    }, []);

    const isEmpty = !isLoading && results.length === 0;

    return (
        <Layout>
            <section className={styles.page}>

                <h1 className={styles.title}>Store</h1>

                <div className={styles.searchRow}>

                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search for a comic…"
                        aria-label="Search comics"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                    />

                    <button type="button" className={styles.searchBtn} onClick={runSearch}>Search</button>

                </div>

                <p className={styles.errorText}>{error}</p>

                <p className={styles.empty} style={{ display: isEmpty ? undefined : 'none' }}>
                    {isLoading ? 'Loading…' : 'No comics found.'}
                </p>

                <section className={styles.grid}>
                    {results.map(item => <StoreCard key={keyFor(item)} item={item} />)}
                    <div className={styles.sentinel} ref={sentinelRef} />
                    {isLoadingMore && <p className={styles.loadingMore}>Loading more…</p>}
                </section>

            </section>
        </Layout>
    );

}
