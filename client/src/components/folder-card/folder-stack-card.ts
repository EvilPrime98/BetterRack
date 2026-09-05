import { UltraComponent } from "ultra-light-js"
import { ImageGen } from "../image-generic/image-generic"
import styles from '../comic-card/comic-card.module.css';
import { wikiImageOptimizer } from "@/services/wiki.service";

export function FolderStackCard({
    cover
}: {
    cover: string;
    isRead: boolean;
}) {

    const RESIZE_DEBOUNCE_MS = 200;

    let resizeObserver: ResizeObserver | null = null;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const onImageMount = ($img: HTMLElement) => {

        resizeObserver = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            if (!width) return;

            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                ($img as HTMLImageElement).src = wikiImageOptimizer(cover, width);
            }, RESIZE_DEBOUNCE_MS);
        });

        resizeObserver.observe($img);

        return () => {
            resizeObserver?.disconnect();
            resizeObserver = null;
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = null;
        }

    }

    const onImageLoad = (e: Event) => {
        const $img = e.currentTarget as HTMLImageElement;
        $img.parentElement?.classList.add(styles.loaded);
    }

    return UltraComponent({

        component: '<article></article>',

        className: [
            styles.comicCard,
            //(isRead) ? styles.isRead : '',
            styles.stackLayer
        ],

        styles: {
            padding: '0'
        },

        children: [

            UltraComponent({

                component: '<div></div>',

                className: [styles.cover],

                children: [

                    `<div class="${styles.board}"></div>`,

                    UltraComponent({

                        component: '<a></a>',

                        children: [

                            ImageGen({
                                onMount: [onImageMount],
                                eventHandler: {
                                    load: onImageLoad
                                },
                                attributes: {
                                    src: cover
                                }
                            })

                        ]

                    }),

                    `<div class="${styles.bagOverlay}"></div>`

                ]

            })

        ]

    })

}
