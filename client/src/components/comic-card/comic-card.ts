import { UltraActivity, UltraComponent, ultraState } from "ultra-light-js";
import styles from './comic-card.module.css';
import { ReadBar } from "../read-bar";
import { ComicRating } from "./rating";
import { ultraComic } from "../../hooks/ultraComic";
import { type ILibraryResponseItem } from "../../library.types";
import { COMICS_TYPE_CTX } from "../../context/comics-types.context";
import { ComicCardTitle } from "./title";
import { ComicCardMeta } from "./meta";
import { ComicCardCredits } from "./credits";
import { ComicCardCover } from "./cover";
import { READ_TYPES_CTX } from "../../context/read-types.context";
import { COMIC_CACHE_CONTEXT } from "../../context/comic-cache.context";
import { IdentifyButton } from "./identify-button";

export function ComicCard({
    item
}: {
    item: ILibraryResponseItem
}) {

    const { comic, getComic, getComicById, subsComic } = ultraComic();
    const readerHref = `/${item.uid}/reader`;

    const [itemCache, setItemCache, subsItemCache] = ultraState(
        COMIC_CACHE_CONTEXT.getCacheById(item.uid)
    );

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
        if (cache?.prefId) {
            await getComicById(cache.prefId);
        } else {
            await getComic(item.name)
            if (comic()) {
                COMIC_CACHE_CONTEXT.setCacheById(item.uid, {
                    prefId: comic()?.pageId
                })
            }
        }
    }

    const onCacheChange = async (entry: ReturnType<typeof COMIC_CACHE_CONTEXT.getCacheById>) => {
        setItemCache(entry);
        await scanComic();
    }

    return UltraActivity({

        mode: {
            state: isVisible,
            subscriber: [READ_TYPES_CTX.type.subscribe, subsItemCache]
        },

        onMount: [
            scanComic,
            () => COMIC_CACHE_CONTEXT.subscribeById(item.uid, onCacheChange)
        ],

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

                    ComicCardMeta({
                        comic,
                        subsComic
                    }),

                    UltraActivity({
                        mode: {
                            state: () => COMICS_TYPE_CTX.type.get() === 'detail',
                            subscriber: COMICS_TYPE_CTX.type.subscribe
                        },
                        component: '<div></div>',
                        className: [styles.creditRow],
                        children: [
                            `<span class="${styles.creditLabel}">Comic</span>`,
                            UltraComponent({
                                component: `<span class="${styles.creditValue}"></span>`,
                                trigger: [{
                                    subscriber: subsComic,
                                    triggerFunction: ($span: HTMLElement) => {
                                        $span.textContent = comic()?.title || '';
                                    }
                                }]
                            }),
                            IdentifyButton({ uid: item.uid })
                        ]
                    }),

                    ComicCardCredits({
                        comic,
                        subsComic
                    }),

                    ComicRating({
                        uid: item.uid
                    })

                ]

            })

        ]

    })

}
