import { UltraComponent, UltraLink } from "ultra-light-js";
import styles from './folder-card.module.css';
import { FolderIcon } from "@/icons/folder.icon";
import { ChevronDownIcon } from "@/icons/chevron.icon";
import { COMICS_TYPE_CTX } from "@/context/comics-types.context";

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
                className: [styles.cardLink],
                children: [

                    UltraComponent({
                        component: '<span></span>',
                        className: [styles.cover],
                        children: [
                            FolderIcon({ size: 40, color: '#34c3d1' })
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.body],
                        children: [
                            `<span class="${styles.kind}">Folder</span>`,
                            `<p class="${styles.title}">${title}</p>`
                        ]
                    }),

                    UltraComponent({
                        component: '<span></span>',
                        className: [styles.chevron],
                        attributes: {
                            'aria-hidden': 'true'
                        },
                        children: [
                            ChevronDownIcon({ size: 14, color: 'currentColor' })
                        ]
                    })

                ]
            })

        ]

    })

}
