import { UltraActivity } from "ultra-light-js";
import styles from './app-loader.module.css';

export function AppLoader({
    mode
}: {
    mode: {
        state: () => boolean;
        subscriber: ((fn: () => void) => () => void) | ((fn: () => void) => () => void)[];
    };
}) {

    return UltraActivity({

        mode,

        component: '<div></div>',

        className: [styles.overlay],

        children: [
            `<img src="/favicon.svg" alt="BetterRack" class="${styles.logo}" />`,
            `<p class="${styles.brand}">Better<span>Rack</span></p>`,
            `<div class="${styles.spinner}"></div>`,
            `<p class="${styles.hint}">Loading your library&hellip;</p>`
        ]

    })

}
