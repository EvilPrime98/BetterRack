import { UltraActivity } from "ultra-light-js";
import styles from './loader.module.css';

export function Loader({
    mode,
    label
}: {
    mode: {
        state: () => boolean;
        subscriber: ((fn: () => void) => () => void) | ((fn: () => void) => () => void)[];
    };
    label?: string;
}) {

    return UltraActivity({

        mode,

        component: '<div></div>',

        className: [styles.loader],

        children: [
            `<div class="${styles.spinner}"></div>`,
            ...(label ? [`<p class="${styles.label}">${label}</p>`] : [])
        ]

    })

}
