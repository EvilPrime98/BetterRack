import { UltraComponent, UltraLink, ultraState } from "ultra-light-js";
import styles from './sidebar.module.css';
import { FolderIcon } from "../../icons/folder.icon";
import { ChevronDownIcon } from "../../icons/chevron.icon";
import { SIDEBAR_CONTEXT } from "../../context/sidebar.context";
import { LIBRARY_CONTEXT } from "../../context/library.context";
import type { ILibraryMetadataGroup } from "../../library.types";

export function SideBarMetadataGroup({
    group
}: {
    group: ILibraryMetadataGroup
}) {

    const [isExpanded, setIsExpanded, subsExpanded] = ultraState(false);

    function toggle() {
        setIsExpanded(!isExpanded());
    }

    function closeSidebar() {
        LIBRARY_CONTEXT.searchQuery.set('');
        SIDEBAR_CONTEXT.isExpanded.set(false);
    }

    function onExpandChange($nav: HTMLElement) {
        if (!isExpanded()) {
            $nav.replaceChildren();
            return;
        }
        $nav.replaceChildren(...group.entries.map(entry => UltraLink({
            href: `/${entry.uid}/reader`,
            className: [styles.item],
            eventHandler: { click: closeSidebar },
            children: [`<span>${entry.name}</span>`]
        })));
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
                    `<span>${group.key}</span>`,
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
