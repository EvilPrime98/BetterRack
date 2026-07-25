import { UltraComponent } from "ultra-light-js";
import styles from './comic-card.module.css'
import type { WikiComic } from "better-wiki";

export function InfoRow({
    label,
    subsComic,
    onValueChange
}:{
    label: string;
    subsComic: (fn: (value: WikiComic | null) => void) => () => void;
    onValueChange: ($span: HTMLElement) => void;
}){
    return UltraComponent({
        component: '<div></div>',
        className: [styles.infoRow],
        children: [
            `<span class="${styles.infoLabel}">${label}</span>`,
            UltraComponent({
                component: `<span class="${styles.infoValue}"></span>`,
                trigger: [{
                    subscriber: subsComic,
                    triggerFunction: onValueChange
                }]
            })
        ]
    });
}