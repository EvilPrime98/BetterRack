import { UltraComponent, UltraLink, ultraState } from "ultra-light-js";
import styles from './sidebar.module.css';
import { SIDEBAR_CONTEXT } from "../../context/sidebar.context";
import { VIEWPORT_CONTEXT } from "../../context/viewport.context";
import { LIBRARY_CONTEXT } from "../../context/library.context";
import { SideBarGroup } from "./sidebar-group";
import type { ILibraryGroup } from "../../library.types";
import { RefreshLibraryButton } from "./refresh-button";
import { SidebarCloseButton } from "./close-button";
import { SidebarSearch } from "./sidebar-search";
import { GearIcon } from "../../icons/gear.icon";
import { ShopIcon } from "../../icons/shop.icon";

export function SideBar() {

    const [items, setItems, subsItems] = ultraState<ILibraryGroup[]>([]);

    function fetchLibrary() {
        LIBRARY_CONTEXT.fetchLibrary();
        if (LIBRARY_CONTEXT.groups.get().length) {
            setItems(LIBRARY_CONTEXT.groups.get());
        }
    };

    function closeSidebar() { SIDEBAR_CONTEXT.isExpanded.set(false) };

    function isHidden() {
        return VIEWPORT_CONTEXT.isDesktop.get()
            ? SIDEBAR_CONTEXT.isCollapsed.get()
            : !SIDEBAR_CONTEXT.isExpanded.get();
    }

    // Set the visibility classes before the element is inserted.
    // ultra-light-js defers onMount with requestAnimationFrame, so
    // onSidebarStateChange runs one frame later. A route change rebuilds
    // this component. Without these classes, the sidebar paints open for
    // one frame and then animates shut.
    function initialSidebarClasses() {
        const classes = [styles.sideBar];
        if (SIDEBAR_CONTEXT.isExpanded.get()) classes.push(styles.expanded);
        if (SIDEBAR_CONTEXT.isCollapsed.get()) classes.push(styles.collapsed);
        return classes;
    }

    function onSidebarStateChange($aside: HTMLElement) {
        $aside.classList.toggle(styles.expanded, SIDEBAR_CONTEXT.isExpanded.get());
        $aside.classList.toggle(styles.collapsed, SIDEBAR_CONTEXT.isCollapsed.get());
        if (!isHidden()) {
            $aside.removeAttribute('inert');
        } else {
            if ($aside.contains(document.activeElement)) {
                (document.activeElement as HTMLElement).blur();
            }
            $aside.setAttribute('inert', '');
        }
    }

    function onBackdropChange($backdrop: HTMLElement) {
        $backdrop.classList.toggle(styles.visible, SIDEBAR_CONTEXT.isExpanded.get());
    }

    function onItemsChange($nav: HTMLElement) {
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
                ...currItems.map(group => {
                    return SideBarGroup({ group })
                })
            )
        }
    }

    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') closeSidebar();
    }

    return UltraComponent({

        component: '<div></div>',

        children: [

            UltraComponent({
                component: '<div></div>',
                className: SIDEBAR_CONTEXT.isExpanded.get()
                    ? [styles.backdrop, styles.visible]
                    : [styles.backdrop],
                eventHandler: { click: closeSidebar },
                trigger: [{
                    subscriber: SIDEBAR_CONTEXT.isExpanded.subscribe,
                    triggerFunction: onBackdropChange
                }]
            }),

            UltraComponent({

                onMount: [
                    onSidebarStateChange,
                    fetchLibrary,
                    () => {
                        document.addEventListener('keydown', onKeydown);
                        return () => document.removeEventListener('keydown', onKeydown);
                    }
                ],

                component: '<aside></aside>',

                attributes: {
                    role: 'navigation',
                    'aria-label': 'Library folders',
                    ...(isHidden() ? { inert: '' } : {})
                },

                className: initialSidebarClasses(),

                children: [

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.header],
                        children: [
                            `<span class="${styles.title}">Library</span>`,
                            UltraComponent({
                                component: '<div></div>',
                                className: [styles.headerActions],
                                children: [
                                    SidebarCloseButton()
                                ]
                            })
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.section],
                        children: [
                            `<span class="${styles.sectionTitle}">User</span>`,
                            UltraLink({
                                href: '/settings',
                                className: [styles.item],
                                eventHandler: { click: closeSidebar },
                                children: [
                                    GearIcon({ size: 16 }),
                                    `<span>Settings</span>`
                                ]
                            })
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.section],
                        children: [
                            `<span class="${styles.sectionTitle}">Store</span>`,
                            UltraLink({
                                href: '/store',
                                className: [styles.item],
                                eventHandler: { click: closeSidebar },
                                children: [
                                    ShopIcon({ size: 16 }),
                                    `<span>Store</span>`
                                ]
                            })
                        ]
                    }),

                    SidebarSearch(),

                    RefreshLibraryButton(),

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
                        subscriber: [
                            SIDEBAR_CONTEXT.isExpanded.subscribe,
                            SIDEBAR_CONTEXT.isCollapsed.subscribe,
                            VIEWPORT_CONTEXT.isDesktop.subscribe
                        ],
                        triggerFunction: onSidebarStateChange
                    }
                ]
            })

        ],

        trigger: [{
            subscriber: LIBRARY_CONTEXT.groups.subscribe,
            triggerFunction: () => {
                setItems(LIBRARY_CONTEXT.groups.get())
            }
        }]

    })

}
