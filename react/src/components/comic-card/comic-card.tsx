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
import { useReadTypesContext } from '@/context/ReadTypesContext';
import { useComicCacheStore } from '@/stores/comicCache.store';
import { useComicIdentStore } from '@/stores/comicIdent.store';
import { IdentifyButton } from './identify-button';
import { ComicCardActions } from './actions';
import { CrButton } from '@/components/cr-button/cr-button';
import { identifyLibraryEntry } from '@/services/library.service';

export function ComicCard({
    item
}: {
    item: ILibraryResponseItem;
}) {

    const navigate = useNavigate();
    const [comic, setComic] = useState<WikiComic | null>(item.comic ?? null);
    const [identified, setIdentified] = useState(item.identified !== false);
    const articleRef = useRef<HTMLElement>(null);
    const readerHref = `/${item.uid}/reader`;
    const comicsType = useComicsTypeStore((s) => s.type);
    const { type: readFilter } = useReadTypesContext();
    const itemCache = useComicCacheStore((s) => s.cache[item.uid] ?? null);
    const lastIdentified = useComicIdentStore((s) => s.lastIdentified);
    const isRead = itemCache?.read === true;
    const readPer = itemCache ? (itemCache.read === true ? 100 : itemCache.readPer ?? 0) : 0;

    const isVisible = (() => {
        const currReadPer = itemCache?.readPer || 0;
        if (readFilter === 'all') {
            return true;
        } else if (readFilter === 'read') {
            return currReadPer === 100;
        } else if (readFilter === 'reading') {
            return currReadPer > 0 && currReadPer < 100;
        } else {
            return currReadPer === 0;
        }
    })();

    useEffect(() => {
        if (lastIdentified?.uid !== item.uid) return;
        setComic(lastIdentified.comic);
        setIdentified(true);
    }, [lastIdentified, item.uid]);

    useEffect(() => {

        if (item.identified !== undefined) return undefined;

        const node = articleRef.current;
        if (!node) return undefined;

        const observer = new IntersectionObserver((entries) => {
            if (!entries.some(e => e.isIntersecting)) return;
            observer.disconnect();
            identifyLibraryEntry(item.uid)
                .then((resolved) => {
                    setComic(resolved.comic ?? null);
                    setIdentified(resolved.identified === true);
                })
                .catch(() => {});
        }, { rootMargin: '200px' });

        observer.observe(node);

        return () => observer.disconnect();

    }, [item.uid, item.identified]);

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

                <ComicCardInfo comic={comic} />

                <div className={styles.actionsBlock}>
                    <ComicRating uid={item.uid} />
                    <ComicCardActions uid={item.uid} name={item.name} />
                </div>

            </div>

        </article>
    );

}
