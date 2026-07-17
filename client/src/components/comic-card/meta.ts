import type { WikiComic } from "better-wiki";
import { UltraComponent } from "ultra-light-js";
import styles from './comic-card.module.css';

export function ComicCardMeta({
    comic,
    subsComic
}: {
    comic: () => WikiComic|null;
    subsComic: (fn: (value: WikiComic | null) => void) => () => void;
}) {
    
    const onMetaChange = ($p: HTMLElement) => {
        const c = comic();
        const parts = [
            c?.volume ? `Vol. ${c.volume}` : '',
            c?.releaseDate?.releaseYear || ''
        ].filter(Boolean);
        $p.textContent = parts.join(' · ');
    }

    return UltraComponent({
        component: `<p class="${styles.meta}"></p>`,
        trigger: [{
            subscriber: subsComic,
            triggerFunction: onMetaChange
        }]
    })

}