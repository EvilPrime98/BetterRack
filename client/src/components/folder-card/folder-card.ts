import { UltraComponent, UltraLink } from "ultra-light-js";
import styles from './folder-card.module.css';
import { ChevronDownIcon } from "@/icons/chevron.icon";
import { COMICS_TYPE_CTX } from "@/context/comics-types.context";
import { LIBRARY_CONTEXT } from "@/context/library.context";
//import { FolderCardStack } from "./folder-card-stack";
import { FolderCardBasic } from "./folder-card-basic";
import { FolderCardActions } from "./folder-card-actions";

const STACK_SIZE = 3;

export function FolderCard({
    title,
    uid
}:{
    title: string,
    uid: string
}) {

    const stackCovers = LIBRARY_CONTEXT.getLibraryItems({
        onlyDir: false, uid
    }).filter(item => !item.did)
    .slice(0, STACK_SIZE);

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
            ...(COMICS_TYPE_CTX.type.get() === 'detail' ? [styles.detailMode] : []),
            ...(stackCovers.length ? [styles.hasStack] : [])
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

                    /* (stackCovers.length)
                    ? FolderCardStack({ title, stackCovers })
                    : FolderCardBasic({ title }), */

                    FolderCardBasic({ title }),

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
                    }),

                    FolderCardActions({
                        title,
                        uid
                    })

                ]
            })

        ]

    })

}
