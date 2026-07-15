import { UltraComponent } from "ultra-light.js";
import styles from './sidebar.module.css';
import { SIDEBAR_CONTEXT } from "../context/sidebar.context";
import { ultraLibrary } from "../hooks/ultraLibrary";
import { CloseIcon } from "../icons/close.icon";
import { SideBarElement } from "./sider-bar-element";

export function SideBar() {

    const { items, subsItems, fetchLibrary, queryClient } = ultraLibrary({ onlyDir: true })

    const closeSidebar = () => SIDEBAR_CONTEXT.isExpanded.set(false);

    const onExpandChange = ($aside: HTMLElement) => {
        const isExpanded = SIDEBAR_CONTEXT.isExpanded.get();
        $aside.classList.toggle(styles.expanded, isExpanded);

        if (isExpanded) {
            $aside.removeAttribute('inert');
        } else {
            if ($aside.contains(document.activeElement)) {
                (document.activeElement as HTMLElement).blur();
            }
            $aside.setAttribute('inert', '');
        }
    }

    const onBackdropChange = ($backdrop: HTMLElement) => {
        $backdrop.classList.toggle(styles.visible, SIDEBAR_CONTEXT.isExpanded.get());
    }

    const onItemsChange = ($nav: HTMLElement) => {

        const currItems = [...items()];

        if (!currItems.length) {
            
            $nav.replaceChildren(
                UltraComponent({
                    component: `<p>${queryClient.isFetching() ? 'Loading library…' : 'No folders found'}</p>`,
                    className: [styles.emptyState]
                })
            );

        } else {

            $nav.replaceChildren(
                ...currItems.map(item => SideBarElement({ item }))
            )

        }
        
    }

    const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') closeSidebar();
    }

    return UltraComponent({

        component: '<div></div>',

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.backdrop],
                eventHandler: { click: closeSidebar },
                trigger: [{
                    subscriber: SIDEBAR_CONTEXT.isExpanded.subscribe,
                    triggerFunction: onBackdropChange
                }]
            }),

            UltraComponent({
                onMount: [
                    onExpandChange,
                    fetchLibrary,
                    () => {
                        document.addEventListener('keydown', onKeydown);
                        return () => document.removeEventListener('keydown', onKeydown);
                    }
                ],
                component: '<aside role="navigation" aria-label="Library folders"></aside>',
                className: [styles.sideBar],
                children: [

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.header],
                        children: [
                            `<span class="${styles.title}">Library</span>`,
                            UltraComponent({
                                component: CloseIcon({ size: 16 }),
                                className: [styles.closeButton],
                                attributes: { role: 'button' },
                                eventHandler: { click: closeSidebar }
                            })
                        ]
                    }),

                    UltraComponent({
                        onMount: [onItemsChange],
                        component: '<nav></nav>',
                        className: [styles.list],
                        trigger: [{
                            subscriber: subsItems,
                            triggerFunction: onItemsChange
                        }]
                    })

                ],
                trigger: [
                    {
                        subscriber: SIDEBAR_CONTEXT.isExpanded.subscribe,
                        triggerFunction: onExpandChange
                    }
                ]
            })

        ]

    })

}
