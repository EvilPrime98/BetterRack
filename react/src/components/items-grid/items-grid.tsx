import { useEffect, useState } from 'react';
import { FolderCard } from '@/components/folder-card/folder-card';
import { ComicCard } from '@/components/comic-card/comic-card';
import type { IComicFilters, ILibraryResponseItem } from '@/library.types';

const PAGE_SIZE = 60;

export function ItemsGrid({
    items,
    filters
}: {
    items: ILibraryResponseItem[];
    filters?: IComicFilters;
}) {

    const [count, setCount] = useState(PAGE_SIZE);

    const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
    const hasMore = count < items.length;

    useEffect(() => {
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some(e => e.isIntersecting)) setCount(c => c + PAGE_SIZE);
            },
            { rootMargin: '600px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [sentinel]);

    return (
        <>
            {items.slice(0, count).map(item => item.did
                ? <FolderCard key={item.uid} title={item.name} uid={item.uid} />
                : <ComicCard key={item.uid} item={item} filters={filters} />
            )}
            {hasMore && <div key={count} ref={setSentinel} style={{ gridColumn: '1 / -1', height: 1 }} />}
        </>
    );

}
