import { UltraComponent, UltraLink, ultraState } from "ultra-light-js";
import styles from './sidebar.module.css';
import { SIDEBAR_CONTEXT } from "../../context/sidebar.context";
import { VIEWPORT_CONTEXT } from "../../context/viewport.context";
import { LIBRARY_CONTEXT } from "../../context/library.context";
import { SideBarGroup } from "./sidebar-group";
import type { ILibraryGroup } from "../../library.types";
import type { TLibraryStructure } from "../../services/library.service";
import { BRButton } from "../br-button/br-button";
import { BRDropdown, type IBRDropdownOption } from "../br-dropdown/br-dropdown";
import { SeriesList } from "./series-list";
import { RefreshLibraryButton } from "./refresh-button";
import { SidebarSearch } from "./sidebar-search";
import { Footer } from "../footer/footer";
import { GearIcon } from "../../icons/gear.icon";
import { ShopIcon } from "../../icons/shop.icon";
import { DownloadIcon } from "../../icons/download.icon";
import { BookmarkIcon } from "../../icons/bookmark.icon";
import { BookOpenIcon } from "../../icons/book-open.icon";

const STRUCTURE_OPTIONS: IBRDropdownOption<TLibraryStructure>[] = [
    { value: 'folders', label: 'Folders' },
    { value: 'series', label: 'Series' }
];

export function SideBar() {

    const [items, setItems, subsItems] = ultraState<ILibraryGroup[]>([]);

    const series = SeriesList({ groups: items, isHidden });

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

    function onCompactChange($el: HTMLElement) {
        const isCompact = SIDEBAR_CONTEXT.isCompact.get();
        $el.classList.toggle(styles.folded, isCompact);
        $el.toggleAttribute('inert', isCompact);
    }

    function onToggleChange($button: HTMLElement) {
        const isCompact = SIDEBAR_CONTEXT.isCompact.get();
        $button.textContent = isCompact ? 'Show more' : 'Show less';
        $button.setAttribute('aria-expanded', String(!isCompact));
    }

    function Fold(...children: (string | HTMLElement)[]) {
        const isCompact = SIDEBAR_CONTEXT.isCompact.get();
        return UltraComponent({
            component: '<div></div>',
            className: isCompact ? [styles.fold, styles.folded] : [styles.fold],
            attributes: isCompact ? { inert: '' } : {},
            onMount: [onCompactChange],
            trigger: [{
                subscriber: SIDEBAR_CONTEXT.isCompact.subscribe,
                triggerFunction: onCompactChange
            }],
            children: [
                UltraComponent({
                    component: '<div></div>',
                    className: [styles.foldInner],
                    children
                })
            ]
        });
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
        } else if (LIBRARY_CONTEXT.structure.get() === 'series') {
            series.render($nav);
        } else {
            series.disconnect();
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

                    BRButton({
                        text: SIDEBAR_CONTEXT.isCompact.get() ? 'Show more' : 'Show less',
                        variant: 'ghost',
                        className: [styles.toggleButton],
                        eventHandler: {
                            click: () => SIDEBAR_CONTEXT.isCompact.set(!SIDEBAR_CONTEXT.isCompact.get())
                        },
                        onMount: [onToggleChange],
                        trigger: [{
                            subscriber: SIDEBAR_CONTEXT.isCompact.subscribe,
                            triggerFunction: onToggleChange
                        }]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.section],
                        children: [
                            `<span id="library-group-by-label" class="${styles.sectionTitle}">Group by</span>`,
                            BRDropdown({
                                ariaLabelledby: 'library-group-by-label',
                                options: STRUCTURE_OPTIONS,
                                value: LIBRARY_CONTEXT.structure.get,
                                subscribe: LIBRARY_CONTEXT.structure.subscribe,
                                onChange: (value) => { void LIBRARY_CONTEXT.setStructure(value) }
                            })
                        ]
                    }),

                    Fold(
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
                            }),
                            UltraLink({
                                href: '/store/downloads',
                                className: [styles.item],
                                eventHandler: { click: closeSidebar },
                                children: [
                                    DownloadIcon({ size: 16 }),
                                    `<span>Downloads</span>`
                                ]
                            })
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.section],
                        children: [
                            `<span class="${styles.sectionTitle}">Browse</span>`,
                            UltraLink({
                                href: '/new',
                                className: [styles.item],
                                eventHandler: { click: closeSidebar },
                                children: [
                                    BookmarkIcon({ size: 16 }),
                                    `<span>Recently added</span>`
                                ]
                            }),
                            UltraLink({
                                href: '/reading',
                                className: [styles.item],
                                eventHandler: { click: closeSidebar },
                                children: [
                                    BookOpenIcon({ size: 16 }),
                                    `<span>Keep reading</span>`
                                ]
                            })
                        ]
                    }),

                    SidebarSearch(),

                    RefreshLibraryButton()
                    ),

                    UltraComponent({
                        onMount: [
                            onItemsChange,
                            () => series.disconnect
                        ],
                        component: '<nav></nav>',
                        className: [styles.list],
                        trigger: [
                            {
                                subscriber: subsItems,
                                triggerFunction: onItemsChange
                            },
                            {
                                subscriber: [
                                    SIDEBAR_CONTEXT.isExpanded.subscribe,
                                    SIDEBAR_CONTEXT.isCollapsed.subscribe,
                                    VIEWPORT_CONTEXT.isDesktop.subscribe
                                ],
                                triggerFunction: ($nav: HTMLElement) => {
                                    if (items().length && LIBRARY_CONTEXT.structure.get() === 'series') series.render($nav);
                                }
                            }
                        ]
                    }),

                    Fold(Footer())

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
