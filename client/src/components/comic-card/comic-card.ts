import { UltraActivity, UltraComponent } from "ultra-light-js";
import styles from './comic-card.module.css';
import { ReadBar } from "../read-bar";
import { ComicRating } from "./rating";
import { ultraComic } from "../../hooks/ultraComic";
import type { ILibraryResponseItem } from "../../library.types";
import { COMICS_TYPE_CTX } from "../../context/comics-types.context";
import { ComicCardTitle } from "./title";
import { ComicCardMeta } from "./meta";
import { ComicCardCredits } from "./credits";
import { ComicCardCover } from "./cover";
import { READ_TYPES_CTX } from "../../context/read-types.context";
import { COMIC_CACHE_CONTEXT } from "../../context/comic-cache.context";

export function ComicCard({
    item
}: {
    item: ILibraryResponseItem
}) {

    const readPer = COMIC_CACHE_CONTEXT.getCacheById(item.uid)?.readPer || 0;
    const readerHref = `/${item.uid}/reader`;
    const { comic, getComic, subsComic } = ultraComic();

    const onCardTypeChange = ($article: HTMLElement) => {
        $article.classList.toggle(
            styles.detailMode, 
            COMICS_TYPE_CTX.type.get() === 'detail'
        );
    }

    const isVisible = () => {
        const currReadFilter = READ_TYPES_CTX.type.get();
        if (currReadFilter === 'all'){
            return true;
        }else if (currReadFilter === 'read'){
            return readPer === 100
        }else if (currReadFilter === 'reading'){
            return readPer > 0 && readPer < 100
        }else {
            return readPer === 0
        }
    }

    return UltraActivity({

        mode: {
            state: isVisible,
            subscriber: READ_TYPES_CTX.type.subscribe
        },

        onMount: [() => getComic(item.name)],

        component: '<article></article>',

        className: [
            styles.comicCard,
            ...(COMICS_TYPE_CTX.type.get() === 'detail' ? [styles.detailMode] : [])
        ],

        trigger: [{
            subscriber: COMICS_TYPE_CTX.type.subscribe,
            triggerFunction: onCardTypeChange
        }],

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

                    ReadBar({ readPercentage: readPer })

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
