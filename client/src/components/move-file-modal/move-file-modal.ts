import { UltraActivity, UltraComponent } from "ultra-light-js";
import styles from './move-file-modal.module.css';
import { FolderIcon } from "@/icons/folder.icon";
import { LIBRARY_CONTEXT } from "@/context/library.context";
import { MOVE_FILE_MODAL_CTX } from "@/context/move-file-modal.context";
import type { ILibraryGroup } from "@/library.types";

function buildFolderPath(uid: string, groups: ILibraryGroup[]): string {

    const group = groups.find(g => g.uid === uid);
    if (group) return group.name;

    const byUid = new Map<string, { uid: string; name: string; parentId?: string }>();
    const ownerGroup = new Map<string, ILibraryGroup>();

    groups.forEach(g => g.entries.forEach(entry => {
        byUid.set(entry.uid, entry);
        ownerGroup.set(entry.uid, g);
    }));

    const names: string[] = [];
    let current = byUid.get(uid);

    while (current) {
        names.unshift(current.name);
        if (!current.parentId) {
            const owner = ownerGroup.get(current.uid);
            if (owner) names.unshift(owner.name);
            break;
        }
        current = byUid.get(current.parentId);
    }

    return names.join(' / ');

}

export function MoveFileModal() {

    let $list: HTMLElement | null = null;

    const cancel = () => MOVE_FILE_MODAL_CTX.closeMoveFileModal();

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cancel();
    }

    const renderFolders = () => {

        if (!$list) return;

        const groups = LIBRARY_CONTEXT.groups.get();
        const folders = LIBRARY_CONTEXT.getLibraryItems({ onlyDir: true });

        $list.replaceChildren(

            UltraComponent({
                component: `<li class="${styles.item}"></li>`,
                eventHandler: { click: () => MOVE_FILE_MODAL_CTX.selectMoveTarget(undefined) },
                children: [
                    FolderIcon({ size: 14, color: '#34c3d1' }),
                    '<span>Library root</span>'
                ]
            }),

            ...(folders.length
                ? folders.map(folder => UltraComponent({
                    component: `<li class="${styles.item}"></li>`,
                    eventHandler: { click: () => MOVE_FILE_MODAL_CTX.selectMoveTarget(folder.uid) },
                    children: [
                        FolderIcon({ size: 14, color: '#c7c7c7' }),
                        `<span>${buildFolderPath(folder.uid, groups)}</span>`
                    ]
                }))
                : [UltraComponent({
                    component: `<li class="${styles.empty}">No folders yet.</li>`
                })]
            )

        );

    }

    return UltraActivity({

        mode: {
            state: MOVE_FILE_MODAL_CTX.isVisible.get,
            subscriber: MOVE_FILE_MODAL_CTX.isVisible.subscribe
        },

        component: '<div></div>',

        className: [styles.overlay],

        onMount: [
            () => {
                document.addEventListener('keydown', onKeydown);
                return () => document.removeEventListener('keydown', onKeydown);
            }
        ],

        trigger: [{
            subscriber: [
                MOVE_FILE_MODAL_CTX.isVisible.subscribe,
                LIBRARY_CONTEXT.groups.subscribe
            ],
            triggerFunction: () => {
                if (MOVE_FILE_MODAL_CTX.isVisible.get()) renderFolders();
            },
            defer: true
        }],

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.backdrop],
                eventHandler: { click: cancel }
            }),

            UltraComponent({

                component: '<div></div>',

                attributes: {
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': 'Move comic'
                },

                className: [styles.modal],

                children: [

                    UltraComponent({
                        component: `<p class="${styles.title}"></p>`,
                        trigger: [{
                            subscriber: MOVE_FILE_MODAL_CTX.fileName.subscribe,
                            triggerFunction: ($p: HTMLElement) => {
                                $p.textContent = `Move "${MOVE_FILE_MODAL_CTX.fileName.get()}"`;
                            }
                        }],
                        onMount: [
                            ($p: HTMLElement) => {
                                $p.textContent = `Move "${MOVE_FILE_MODAL_CTX.fileName.get()}"`;
                            }
                        ]
                    }),

                    UltraComponent({
                        component: `<ul class="${styles.list}"></ul>`,
                        onMount: [
                            ($el) => {
                                $list = $el as HTMLElement;
                                renderFolders();
                            }
                        ]
                    })

                ]
            })

        ]
    })

}
