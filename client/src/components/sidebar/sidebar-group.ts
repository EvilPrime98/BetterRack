import { UltraComponent, ultraState } from "ultra-light-js";
import styles from './sidebar.module.css';
import { LIBRARY_CONTEXT } from "../../context/library.context";
import { NEW_FOLDER_MODAL_CTX } from "../../context/new-folder-modal.context";
import { SideBarElement } from "./sider-bar-element";
import { FolderIcon } from "../../icons/folder.icon";
import { FolderPlusIcon } from "../../icons/folder-plus.icon";
import { ChevronDownIcon } from "../../icons/chevron.icon";
import type { ILibraryGroup } from "../../library.types";

export function SideBarGroup({
    group
}: {
    group: ILibraryGroup
}) {

    const [isExpanded, setIsExpanded, subsExpanded] = ultraState(false);

    function toggle() {
        setIsExpanded(!isExpanded());
    }

    function onNewFolder(e: Event) {
        e.stopPropagation();
        NEW_FOLDER_MODAL_CTX.openNewFolderModal(group.uid);
    }

    function onExpandChange($nav: HTMLElement) {
        if (isExpanded()) {
            const entries = LIBRARY_CONTEXT.getLibraryItems({ onlyDir: true, uid: group.uid });
            $nav.replaceChildren(...entries.map(item => SideBarElement({ item })));
        } else {
            $nav.replaceChildren();
        }
    }

    function onChevronChange($chevron: HTMLElement) {
        $chevron.classList.toggle(styles.chevronExpanded, isExpanded());
    }

    return UltraComponent({
        component: '<div></div>',
        className: [styles.group],
        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.groupHeader],
                eventHandler: { click: toggle },
                children: [
                    FolderIcon({ size: 16 }),
                    `<span>${group.name}</span>`,
                    UltraComponent({
                        component: '<button type="button"></button>',
                        className: [styles.groupHeaderAction],
                        attributes: { 'aria-label': `New folder in ${group.name}` },
                        eventHandler: { click: onNewFolder },
                        children: [FolderPlusIcon({ size: 14 })]
                    }),
                    UltraComponent({
                        component: ChevronDownIcon({ size: 14 }),
                        className: [styles.chevron],
                        onMount: [onChevronChange],
                        trigger: [{
                            subscriber: subsExpanded,
                            triggerFunction: onChevronChange
                        }]
                    })
                ]
            }),

            UltraComponent({
                component: '<nav></nav>',
                className: [styles.groupList],
                onMount: [onExpandChange],
                trigger: [{
                    subscriber: subsExpanded,
                    triggerFunction: onExpandChange
                }]
            })

        ]
    });

}
