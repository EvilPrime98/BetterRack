import { UltraComponent } from "ultra-light-js";
import styles from './comic-card.module.css';
import type { WikiComic } from "better-wiki";

export function ComicCardCredits({
    comic,
    subsComic
}:{
    comic: () => WikiComic|null;
    subsComic: (fn: (value: WikiComic|null) => void) => () => void;
}) {
    
    return UltraComponent({

        component: '<div></div>',

        className: [styles.credits],

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.creditRow],
                children: [
                    `<span class="${styles.creditLabel}">Writer</span>`,
                    UltraComponent({
                        component: `<span class="${styles.creditValue}"></span>`,
                        trigger: [{
                            subscriber: subsComic,
                            triggerFunction: ($span: HTMLElement) => {
                                $span.textContent = (comic()?.credits?.writers || []).join(', ');
                            }
                        }]
                    })
                ]
            }),

            UltraComponent({
                component: '<div></div>',
                className: [styles.creditRow],
                children: [
                    `<span class="${styles.creditLabel}">Artist</span>`,
                    UltraComponent({
                        component: `<span class="${styles.creditValue}"></span>`,
                        trigger: [{
                            subscriber: subsComic,
                            triggerFunction: ($span: HTMLElement) => {
                                $span.textContent = (comic()?.credits?.artists || []).join(', ');
                            }

                        }]
                    })
                ]
            })
        ]
    })
}