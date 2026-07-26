import { UltraComponent, UltraLink, ultraNavigate, ultraQueryParams } from "ultra-light-js";
import styles from './header.module.css';
import { SearchIcon } from "../icons/search.icon";
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

    // UltraLink skips its own navigation when the pathname is unchanged, so a
    // click on '/' while '?search=' is set wouldn't otherwise drop the query
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

    function focusSearchInput(e: Event) {
        (e.currentTarget as HTMLElement)
            .closest(`.${styles.searchBox}`)
            ?.querySelector('input')
            ?.focus();
    }

    // the header is rebuilt on every route navigation (see App.ts/UltraRouter),
    // so restore the last submitted query, and refocus if that rebuild was
    // caused by the user's own search landing on the search page
    function onSearchMount($box: HTMLElement) {
        const $input = $box.querySelector('input');
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

                        onMount: [onSearchMount],

                        children: [

                            UltraComponent({
                                component: SearchIcon({ size: iconSize - 10 }),
                                className: [styles.iconBtn],
                                attributes: {
                                    'aria-hidden': 'true'
                                },
                                eventHandler: {
                                    click: focusSearchInput
                                }
                            }),

                            UltraComponent({
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
                    }),

                    HeaderMenu()

                ]
            })

        ]

    })

}
