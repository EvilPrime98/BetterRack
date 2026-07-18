import { UltraComponent, UltraLink } from "ultra-light-js";
import styles from './folder-card.module.css';
import { FolderIcon } from "../icons/folder.icon";
import { COMICS_TYPE_CTX } from "../context/comics-types.context";

export function FolderCard({
    title,
    uid
}:{
    title: string,
    uid: string
}) {

    const onCardTypeChange = ($article: HTMLElement) => {
        $article.classList.toggle(
            styles.detailMode,
            COMICS_TYPE_CTX.type.get() === 'detail'
        );
    }

    return UltraComponent({

        component: '<article></article>',

        className: [
            styles.folderCard,
            ...(COMICS_TYPE_CTX.type.get() === 'detail' ? [styles.detailMode] : [])
        ],

        trigger: [{
            subscriber: COMICS_TYPE_CTX.type.subscribe,
            triggerFunction: onCardTypeChange
        }],

        children: [

            UltraLink({
                href: `/${uid}`,
                className: [styles.cover],
                children: [
                    FolderIcon({ size: 40, color: '#34c3d1' })
                ]
            }),

            `<p class="${styles.title}">${title}</p>`,

        ]

    })

}
