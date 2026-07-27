import { UltraComponent, UltraLink, ultraNavigate, ultraQueryParams } from "ultra-light-js";
import styles from './header.module.css';
import { SIDEBAR_CONTEXT } from "../context/sidebar.context";
import { BurgerIcon } from "../icons/burger-icon";
import { BetterRackIcon } from "../icons/better-rack.icon";
import { LIBRARY_CONTEXT } from "../context/library.context";
import { HeaderMenu } from "./header-menu";

export function Header() {

    const iconSize = 30;

    function toggleSidebar() {
        SIDEBAR_CONTEXT.isExpanded.set(!SIDEBAR_CONTEXT.isExpanded.get())
    };

    function leaveSearchResults() {
        if (ultraQueryParams().search) ultraNavigate({ href: '/' });
    }

    function goHome() {
        LIBRARY_CONTEXT.searchQuery.set('');
        if (ultraQueryParams().search) ultraNavigate({ href: '/' });
    }

    function clearSearch($input: HTMLInputElement) {
        $input.value = '';
        $input.blur();
        LIBRARY_CONTEXT.searchQuery.set('');
        leaveSearchResults();
    }

    function onSearchMount($el: HTMLElement) {
        const $input = $el as HTMLInputElement;
        if (!$input) return;
        $input.value = LIBRARY_CONTEXT.searchQuery.get();
        if (ultraQueryParams().search) {
            $input.focus();
            const end = $input.value.length;
            $input.setSelectionRange(end, end);
        }
    }

    function onSearchKeydown(e: Event) {
        const key = (e as KeyboardEvent).key;

        if (key === 'Escape') {
            clearSearch(e.target as HTMLInputElement);
            return;
        }

        if (key !== 'Enter') return;

        const query = (e.target as HTMLInputElement).value.trim();
        const onSearchPage = !!ultraQueryParams().search;

        LIBRARY_CONTEXT.searchQuery.set(query);

        if (query) {
            ultraNavigate({ href: `/?search=${encodeURIComponent(query)}` });
        } else if (onSearchPage) {
            ultraNavigate({ href: '/' });
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
                        component: BurgerIcon({ size: iconSize }),
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
                        eventHandler: {
                            click: goHome
                        },
                        children: [
                            BetterRackIcon({ size: iconSize })
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.text],
                        children: [
                            `<span class="${styles.title}">BetterRack</span>`,
                            `<span class="${styles.subtitle}">Comics</span>`
                        ]
                    }),

                    UltraComponent({

                        component: '<div></div>',

                        className: [styles.searchBox, styles.noDrag],

                        children: [
                            
                            UltraComponent({
                                onMount: [onSearchMount],
                                component: '<input type="text" />',
                                className: [styles.searchInput],
                                attributes: {
                                    placeholder: 'Search library…',
                                    'aria-label': 'Search library'
                                },
                                eventHandler: {
                                    keydown: onSearchKeydown
                                }
                            })

                        ]
                    })

                ]

            }),

            UltraComponent({
                component: '<div></div>',
                className: [styles.icons],
                children: [

                    HeaderMenu()

                ]
            })

        ]

    })

}
