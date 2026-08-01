import { UltraComponent, UltraLink, ultraState } from "ultra-light-js";
import type { ILibraryResponseItem } from "../../library.types";
import { NO_IMAGE_URL } from "../../data";
import type { WikiComic } from "better-wiki";
import styles from './comic-card.module.css';
import { ImageGen } from "../image-generic/image-generic";

export function ComicCardCover({
    item,
    comic,
    subsComic
}: {
    item: ILibraryResponseItem;
    comic: () => WikiComic | null;
    subsComic: (fn: (value: WikiComic | null) => void) => () => void;
}) {

    const readerHref = `/${item.uid}/reader`;
    const [loaded, setIsLoaded, subsIsLoaded] = ultraState(false);
    let currentSrc: string | null = null;

    const onCoverChange = ($img: HTMLElement) => {
        const nextSrc = comic()?.cover || NO_IMAGE_URL;
        if (nextSrc !== currentSrc) {
            setIsLoaded(false);
        }
        currentSrc = nextSrc;
        ($img as HTMLImageElement).src = nextSrc;
    }

    const onEventChange = ($span: HTMLElement) => {
        $span.textContent = comic()?.event || '';
    }

    const onCoverError = (e: Event) => {
        const $img = e.currentTarget as HTMLImageElement;
        if ($img.src === NO_IMAGE_URL) {
            setIsLoaded(true);
            return;
        }
        $img.src = NO_IMAGE_URL;
    }

    const onIssueBadgeChange = ($span: HTMLElement) => {
        const issue = comic()?.issue;
        $span.textContent = issue ? `#${issue}` : '';
    }

    return UltraLink({

        href: readerHref,

        trigger: [{
            subscriber: subsIsLoaded,
            triggerFunction: ($link: HTMLElement) => {
                $link.classList.toggle(styles.loaded, loaded())
            }
        }],

        children: [

            ImageGen({
                attributes: {
                    alt: item.name,
                    title: item.name
                },
                eventHandler: {
                    load: () => setIsLoaded(true),
                    error: onCoverError
                },
                trigger: [{
                    subscriber: subsComic,
                    triggerFunction: onCoverChange
                }]
            }),

            UltraComponent({
                component: `<span class="${styles.issueBadge}"></span>`,
                trigger: [{
                    subscriber: subsComic,
                    triggerFunction: onIssueBadgeChange
                }]
            }),

            UltraComponent({
                component: `<span class="${styles.eventBadge}"></span>`,
                trigger: [{
                    subscriber: subsComic,
                    triggerFunction: onEventChange
                }]
            })
        ]

    })
    
}