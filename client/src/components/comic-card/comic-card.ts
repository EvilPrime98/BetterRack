import { UltraActivity, UltraComponent, ultraState } from "ultra-light-js";
import styles from './comic-card.module.css';
import { ReadBar } from "../read-bar";
import { ComicRating } from "./rating";
import { ultraComic } from "../../hooks/ultraComic";
import { type IComicLSCache, type ILibraryResponseItem } from "../../library.types";
import { COMICS_TYPE_CTX } from "../../context/comics-types.context";
import { ComicCardTitle } from "./title";
import { ComicCardInfo } from "./info";
import { ComicCardCover } from "./cover";
import { READ_TYPES_CTX } from "../../context/read-types.context";
import { COMIC_CACHE_CONTEXT } from "../../context/comic-cache.context";
import { IdentifyButton } from "./identify-button";

export function ComicCard({
    item
}: {
    item: ILibraryResponseItem
}) {

    const coverSize = 280; //x2 the rendered size of the image element

    const { comic, getComic, getComicById, subsComic } = ultraComic();
    
    const [itemCache, setItemCache, subsItemCache] = ultraState<IComicLSCache|null>(
        COMIC_CACHE_CONTEXT.getCacheById(item.uid) || null
    );

    const readerHref = `/${item.uid}/reader`;
    
    const getIsRead = () => itemCache()?.read === true;
    
    const getReadPer = () => {
        const cache = itemCache();
        return cache ? (cache.read === true ? 100 : cache.readPer ?? 0) : 0;
    }

    const onCardTypeChange = ($article: HTMLElement) => {
        $article.classList.toggle(
            styles.detailMode,
            COMICS_TYPE_CTX.type.get() === 'detail'
        );
    }

    const onReadStateChange = ($article: HTMLElement) => {
        $article.classList.toggle(styles.isRead, getIsRead());
    }

    const isVisible = () => {
        const currReadFilter = READ_TYPES_CTX.type.get();
        const readPer = itemCache()?.readPer || 0;
        if (currReadFilter === 'all') {
            return true;
        } else if (currReadFilter === 'read') {
            return readPer === 100
        } else if (currReadFilter === 'reading') {
            return readPer > 0 && readPer < 100
        } else {
            return readPer === 0
        }
    }

    const scanComic = async () => {
        const cache = itemCache();
        if (cache?.prefId && cache?.sourceWiki) {
            await getComicById(cache.prefId, cache.sourceWiki, coverSize);
        } else {
            await getComic(item.name,coverSize)
            const found = comic();
            if (found) {
                COMIC_CACHE_CONTEXT.setCacheById(item.uid, {
                    prefId: found.pageId,
                    sourceWiki: found.sourceWiki
                })
            }
        }
    }

    let hasScanned = false;

    const onCacheChange = async (
        entry: ReturnType<typeof COMIC_CACHE_CONTEXT.getCacheById>
    ) => {
        setItemCache(entry || null);
        if (hasScanned) await scanComic();
    }

    COMIC_CACHE_CONTEXT.subscribeById(
        item.uid,
        onCacheChange
    )

    // fetching hits 5 wiki providers per card, so defer it until the card
    // is actually scrolled into view instead of firing for every mounted card
    const onCardMount = ($article: HTMLElement) => {
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some(e => e.isIntersecting)) return;
            observer.disconnect();
            hasScanned = true;
            scanComic();
        }, { rootMargin: '400px' });
        observer.observe($article);
        return () => observer.disconnect();
    }

    return UltraActivity({

        mode: {
            state: isVisible,
            subscriber: [READ_TYPES_CTX.type.subscribe, subsItemCache]
        },

        onMount: [ onCardMount ],

        component: '<article></article>',

        className: [
            styles.comicCard,
            ...(COMICS_TYPE_CTX.type.get() === 'detail' ? [styles.detailMode] : []),
            ...(getIsRead() ? [styles.isRead] : [])
        ],

        trigger: [
            {
                subscriber: COMICS_TYPE_CTX.type.subscribe,
                triggerFunction: onCardTypeChange
            },
            {
                subscriber: subsItemCache,
                triggerFunction: onReadStateChange
            }
        ],

        children: [

            UltraComponent({

                component: '<div></div>',

                className: [styles.cover],

                children: [

                    ComicCardCover({
                        comic,
                        subsComic,
                        item
                    }),

                    ReadBar({
                        getReadPercentage: getReadPer,
                        subsReadPercentage: subsItemCache
                    })

                ]

            }),

            UltraComponent({

                component: '<div></div>',

                className: [styles.details],

                children: [

                    ComicCardTitle({
                        comic,
                        subsComic,
                        readerHref,
                        item
                    }),

                    UltraActivity({
                        component: IdentifyButton({ uid: item.uid }),
                        mode: {
                            state: () => COMICS_TYPE_CTX.type.get() === 'detail',
                            subscriber: COMICS_TYPE_CTX.type.subscribe
                        }
                    }),

                    ComicCardInfo({
                        comic,
                        subsComic
                    }),

                    UltraComponent({
                        /*mode: {
                            state:  () => !ultraComicQueryClient.isFetching(),
                            subscriber: ultraComicQueryClient.subscribeToFetching
                        },*/
                        component: ComicRating({
                            uid: item.uid
                        })
                    })

                ]

            })

        ]

    })

}
