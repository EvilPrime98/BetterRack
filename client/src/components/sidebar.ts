import { UltraComponent, ultraState } from "ultra-light-js";
import styles from './sidebar.module.css';
import { SIDEBAR_CONTEXT } from "../context/sidebar.context";
import { LIBRARY_CONTEXT } from "../context/library.context";
import { CloseIcon } from "../icons/close.icon";
import { SideBarElement } from "./sider-bar-element";
import { RefreshIcon } from "../icons/refresh-icon";
import type { ILibraryResponseItem } from "../library.types";

export function SideBar() {

    const [ items,setItems,subsItems] = ultraState<ILibraryResponseItem[]>([]);

    function fetchLibrary() {
        LIBRARY_CONTEXT.fetchLibrary();
        // on cache hits fetchLibrary won't notify, so hydrate from current state
        if (LIBRARY_CONTEXT.groups.get().length) {
            setItems(LIBRARY_CONTEXT.getLibraryItems({ onlyDir: true }));
        }
    };
    
    function refreshLibrary(){ LIBRARY_CONTEXT.refreshLibrary() };
    
    function closeSidebar(){ SIDEBAR_CONTEXT.isExpanded.set(false) };

    function onRefreshingChange($button: HTMLElement){
        $button.classList.toggle(
            styles.spinning, 
            LIBRARY_CONTEXT.queryClient.get().isFetching()
        );
    }

    function onExpandChange($aside: HTMLElement){
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

    function onBackdropChange($backdrop: HTMLElement){
        $backdrop.classList.toggle(styles.visible, SIDEBAR_CONTEXT.isExpanded.get());
    }

    function onItemsChange($nav: HTMLElement){
        const currItems = [...items()];
        if (!currItems.length) {
            $nav.replaceChildren(
                UltraComponent({
                    component: `<p>${LIBRARY_CONTEXT.queryClient.get().isFetching() ? 'Loading library…' : 'No folders found'}</p>`,
                    className: [styles.emptyState]
                })
            );
        } else {
            $nav.replaceChildren(
                ...currItems.map(item => {
                    return SideBarElement({ item })
                })
            )
        }
    }

    function onKeydown(event: KeyboardEvent){
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
                                component: '<div></div>',
                                styles: {
                                    display: 'flex',
                                    gap: '10px'
                                },
                                children: [
                                    UltraComponent({
                                        onMount: [onRefreshingChange],
                                        component: RefreshIcon({ size: 16 }),
                                        className: [styles.closeButton],
                                        attributes: { role: 'button', 'aria-label': 'Refresh library' },
                                        eventHandler: { click: refreshLibrary },
                                        trigger: [{
                                            subscriber: LIBRARY_CONTEXT.queryClient.get().subscribeToFetching,
                                            triggerFunction: onRefreshingChange
                                        }]
                                    }),
                                    UltraComponent({
                                        component: CloseIcon({ size: 16 }),
                                        className: [styles.closeButton],
                                        attributes: { role: 'button' },
                                        eventHandler: { click: closeSidebar }
                                    })
                                ]
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

        ],

        trigger: [{
            subscriber: LIBRARY_CONTEXT.groups.subscribe,
            triggerFunction: () =>{
                setItems(LIBRARY_CONTEXT.getLibraryItems({ onlyDir: true }))
            }
        }]

    })

}
