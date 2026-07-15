import { UltraComponent, UltraLink, ultraState } from "ultra-light.js";
import styles from './comic-card.module.css';
import { ReadBar } from "./read-bar";
import { ComicRating } from "./comic-rating";
import { NO_IMAGE_URL } from "../data";
import { ultraComic } from "../hooks/ultraComic";
import type { ILibraryResponseItem } from "../library.types";

export function ComicCard({
    item,
    readPer
}: {
    item: ILibraryResponseItem
    readPer: number,
}) {

    const { comic, getComic, subsComic } = ultraComic();

    const [, setIsLoaded, subsIsLoaded] = ultraState(false);

    const onCoverChange = ($img: HTMLElement) => {
        ($img as HTMLImageElement).src = comic()?.cover || NO_IMAGE_URL;
    }

    const onCoverError = (e: Event) => {
        const $img = e.currentTarget as HTMLImageElement;
        if ($img.src === NO_IMAGE_URL) {
            setIsLoaded(true);
            return;
        }
        $img.src = NO_IMAGE_URL;
    }

    const readerHref = `/${item.uid}/reader`;

    const coverLink = UltraLink({
        href: readerHref,
        children: [
            UltraComponent({
                component: `<img alt="${item.name}" loading="lazy" decoding="async"/>`,
                eventHandler: {
                    load: () => setIsLoaded(true),
                    error: onCoverError
                },
                trigger: [{
                    subscriber: subsComic,
                    triggerFunction: onCoverChange
                }]
            })
        ]
    });

    const unsubLoaded = subsIsLoaded((loaded) => {
        coverLink.classList.toggle(styles.loaded, loaded);
    });

    return UltraComponent({

        onMount: [() => getComic(item.name)],

        component: '<article></article>',

        className: [styles.comicCard],

        cleanup: [unsubLoaded],

        children: [

            UltraComponent({

                component: '<div></div>',

                className: [styles.cover],

                children: [

                    coverLink,

                    ReadBar({ readPercentage: readPer })

                ]

            }),

            ComicRating({
                uid: item.uid
            }),

            UltraLink({
                href: readerHref,
                children: [`<p class="${styles.title}">${item.name}</p>`]
            })

        ]

    })

}
