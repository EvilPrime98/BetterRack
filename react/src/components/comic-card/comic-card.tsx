import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WikiComic } from 'better-wiki';
import styles from './comic-card.module.css';
import { ReadBar } from '@/components/read-bar/read-bar';
import { ComicRating } from './rating';
import type { ILibraryResponseItem } from '@/library.types';
import { useComicsTypeStore } from '@/stores/comicsTypes.store';
import { ComicCardTitle } from './title';
import { ComicCardInfo } from './info';
import { ComicCardCover } from './cover';
import { matchesReadFilter as readFilterMatches, useReadTypesContext } from '@/context/ReadTypesContext';
import { useComicCacheStore } from '@/stores/comicCache.store';
import { useComicIdentStore } from '@/stores/comicIdent.store';
import { IdentifyButton } from './identify-button';
import { ComicCardActions } from './actions';
import { CrButton } from '@/components/cr-button/cr-button';
import { identifyLibraryEntry } from '@/services/library.service';
import { COMIC_FILTERS, type IComicFilters } from '@/library.types';

export function ComicCard({
    item,
    filters
}: {
    filters?: IComicFilters;
    item: ILibraryResponseItem;
}) {

    const navigate = useNavigate();
    const [comic, setComic] = useState<WikiComic | null>(item.comic ?? null);
    const [metaSource, setMetaSource] = useState(item.metaSource);
    const [identified, setIdentified] = useState(item.identified !== false);
    const [isLoadingInfo, setIsLoadingInfo] = useState(item.identified === undefined);
    const articleRef = useRef<HTMLElement>(null);
    const readerHref = `/${item.uid}/reader`;
    const comicsType = useComicsTypeStore((s) => s.type);
    const { type: readFilter } = useReadTypesContext();
    const itemCache = useComicCacheStore((s) => s.cache[item.uid] ?? null);
    const lastIdentified = useComicIdentStore((s) => s.lastIdentified);
    const lastUnidentified = useComicIdentStore((s) => s.lastUnidentified);
    const isRead = itemCache?.read === true;
    const readPer = itemCache ? (itemCache.read === true ? 100 : itemCache.readPer ?? 0) : 0;

    const isVisible = (() => {
        
        const writerFilter = filters?.[COMIC_FILTERS.writer];
        const currReadPer = itemCache?.readPer ?? 0;

        const matchesWriter = !writerFilter 
        || comic?.credits.writers?.some(w => w === writerFilter) === true;

        return matchesWriter && readFilterMatches(readFilter, currReadPer);

    })();

    useEffect(() => {
        if (lastIdentified?.uid !== item.uid) return;
        setComic(lastIdentified.comic);
        setMetaSource('wiki');
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

    const articleClassName = [
        styles.comicCard,
        comicsType === 'detail' ? styles.detailMode : '',
        isRead ? styles.isRead : ''
    ].filter(Boolean).join(' ');

    return (
        <article
            ref={articleRef}
            className={articleClassName}
            style={{ display: isVisible ? undefined : 'none' }}
        >

            <div className={styles.cover}>

                <div className={styles.board} />

                <ComicCardCover comic={comic} item={item} />

                <div className={styles.bagOverlay} />

                <div
                    className={styles.identifyOverlay}
                    style={{ display: (comicsType !== 'detail' && !identified) ? undefined : 'none' }}
                >
                    <IdentifyButton uid={item.uid} />
                </div>

                <ReadBar readPercentage={readPer} />

            </div>

            <div className={styles.details}>

                <ComicCardTitle comic={comic} item={item} readerHref={readerHref} />

                <div style={{ display: 'flex', gap: '5px' }}>

                    <IdentifyButton
                        uid={item.uid}
                        style={{ display: comicsType === 'detail' ? undefined : 'none' }}
                    />

                    <CrButton
                        variant="orange"
                        text="Read"
                        style={{ display: comicsType === 'detail' ? undefined : 'none' }}
                        onClick={() => navigate(readerHref)}
                    />

                </div>

                <ComicCardInfo comic={comic} metaSource={metaSource} navigate={navigate} isLoading={isLoadingInfo} />

                <div className={styles.actionsBlock}>
                    <ComicRating uid={item.uid} />
                    <ComicCardActions uid={item.uid} name={item.name} />
                </div>

            </div>

        </article>
    );

}
