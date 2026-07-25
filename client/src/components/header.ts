import { UltraComponent, UltraLink, ultraState } from "ultra-light-js";
import styles from './header.module.css';
import { SearchIcon } from "../icons/search.icon";
import { SIDEBAR_CONTEXT } from "../context/sidebar.context";
import { BurgerIcon } from "../icons/burger-icon";
import { BetterRackIcon } from "../icons/better-rack.icon";
import { LIBRARY_CONTEXT } from "../context/library.context";
import { HeaderMenu } from "./header-menu";

export function Header() {

    const [isSearchOpen, setSearchOpen, subsSearchOpen] = ultraState(false);

    function toggleSidebar() {
        SIDEBAR_CONTEXT.isExpanded.set(!SIDEBAR_CONTEXT.isExpanded.get())
    };

    function closeSearch() {
        if (!isSearchOpen()) return;
        setSearchOpen(false);
        LIBRARY_CONTEXT.searchQuery.set('');
    }

    function toggleSearch() {
        if (isSearchOpen()) { closeSearch(); return; }
        setSearchOpen(true);
    }

    function onSearchIconClick(e: Event) {
        e.stopPropagation();
        toggleSearch();
    }

    function onSearchOpenChange($box: HTMLElement) {
        const open = isSearchOpen();
        $box.classList.toggle(styles.open, open);
        const $input = $box.querySelector('input');
        if (!$input) return;
        if (open) {
            $input.removeAttribute('tabindex');
            $input.focus();
        } else {
            $input.setAttribute('tabindex', '-1');
            $input.value = '';
            $input.blur();
        }
    }

    function onEnterOrSpace(
        handler: () => void
    ) {
        return (e: Event) => {
            const key = (e as KeyboardEvent).key;
            if (key !== 'Enter' && key !== ' ') return;
            e.preventDefault();
            handler();
        };
    }

    return UltraComponent({

        component: '<header></header>',

        className: [styles.header],

        children: [

            UltraComponent({

                component: '<div></div>',

                className: [styles.left],

                children: [

                    UltraComponent({
                        component: BurgerIcon({ size: '20' }),
                        className: [styles.iconBtn, styles.noDrag],
                        attributes: {
                            role: 'button',
                            tabindex: '0',
                            'aria-label': 'Toggle sidebar'
                        },
                        eventHandler: {
                            click: toggleSidebar,
                            keydown: onEnterOrSpace(toggleSidebar)
                        }
                    }),

                    UltraLink({
                        href: '/',
                        attributes: {
                            'aria-label': 'BetterRack home'
                        },
                        className: [styles.logo, styles.noDrag],
                        children: [
                            BetterRackIcon({ size: 32 })
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.text],
                        children: [
                            `<span class="${styles.title}">BetterRack</span>`,
                            `<span class="${styles.subtitle}">Comics</span>`
                        ]
                    })

                ]

            }),

            UltraComponent({
                component: '<div></div>',
                className: [styles.icons],
                children: [

                    UltraComponent({
                        
                        component: '<div></div>',
                        
                        className: [styles.searchBox, styles.noDrag],
                        
                        onMount: [
                            onSearchOpenChange,
                            () => {
                                document.addEventListener('click', closeSearch);
                                return () => document.removeEventListener('click', closeSearch);
                            }
                        ],
                        
                        trigger: [{
                            subscriber: subsSearchOpen,
                            triggerFunction: onSearchOpenChange
                        }],

                        children: [

                            UltraComponent({
                                component: SearchIcon({ size: 18 }),
                                className: [styles.iconBtn],
                                attributes: {
                                    role: 'button',
                                    tabindex: '0',
                                    'aria-label': 'Search library'
                                },
                                eventHandler: {
                                    click: onSearchIconClick,
                                    keydown: onEnterOrSpace(toggleSearch)
                                }
                            }),

                            UltraComponent({
                                component: '<input type="text" />',
                                className: [styles.searchInput],
                                attributes: {
                                    tabindex: '-1',
                                    placeholder: 'Search library…',
                                    'aria-label': 'Search library'
                                },
                                eventHandler: {
                                    click: (e: Event) => e.stopPropagation(),
                                    input: (e: Event) => LIBRARY_CONTEXT.searchQuery.set((e.target as HTMLInputElement).value),
                                    keydown: (e: Event) => {
                                        if ((e as KeyboardEvent).key !== 'Escape') return;
                                        closeSearch();
                                    }
                                }
                            })

                        ]
                    }),

                    HeaderMenu()

                ]
            })

        ]

    })

}
