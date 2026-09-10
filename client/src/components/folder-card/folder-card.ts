import { UltraComponent, UltraLink } from "ultra-light-js";
import styles from './folder-card.module.css';
import { ChevronDownIcon } from "@/icons/chevron.icon";
import { TrashIcon } from "@/icons/trash.icon";
import { COMICS_TYPE_CTX } from "@/context/comics-types.context";
import { LIBRARY_CONTEXT } from "@/context/library.context";
import { FolderCardStack } from "./folder-card-stack";
import { CONFIRM_MODAL_CTX } from "@/context/confirm-modal.context";
import { FolderCardBasic } from "./folder-card-basic";
import { MoveFileButton } from "@/components/comic-card/move-button";

export function FolderCard({
    title,
    uid
}:{
    title: string,
    uid: string
}) {

    const STACK_SIZE = 3;

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

    const onDeleteClick = async (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        const confirmed = await CONFIRM_MODAL_CTX.confirmDialog({
            title: 'Delete folder?',
            message: `This will remove "${title}" and everything inside it. This cannot be undone.`,
            confirmLabel: 'Delete'
        });
        if (!confirmed) return;
        LIBRARY_CONTEXT.deleteFolder(uid);
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

                    (stackCovers.length)
                    ? FolderCardStack({ stackCovers })
                    : FolderCardBasic({ title }),

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
            }),

            UltraComponent({
                component: '<div></div>',
                className: [styles.folderActions],
                children: [
                    MoveFileButton({ uid, name: title }),
                    UltraComponent({
                        component: '<span></span>',
                        className: [styles.folderActionButton, styles.folderDeleteButton],
                        attributes: {
                            type: 'button',
                            'aria-label': 'Delete this folder'
                        },
                        eventHandler: { click: onDeleteClick },
                        children: [TrashIcon({ size: 14 })]
                    })
                ]
            })

        ]

    })

}
