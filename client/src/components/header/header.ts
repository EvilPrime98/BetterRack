import { UltraComponent, UltraLink, ultraNavigate, ultraQueryParams } from "ultra-light-js";
import styles from './header.module.css';
import { SIDEBAR_CONTEXT } from "@/context/sidebar.context";
import { VIEWPORT_CONTEXT } from "@/context/viewport.context";
import { BurgerIcon } from "@/icons/burger-icon";
import { BetterRackIcon } from "@/icons/better-rack.icon";
import { LIBRARY_CONTEXT } from "@/context/library.context";

export function Header() {

    const iconSize = 30;

    function toggleSidebar() {
        if (VIEWPORT_CONTEXT.isDesktop.get()) {
            SIDEBAR_CONTEXT.isCollapsed.set(!SIDEBAR_CONTEXT.isCollapsed.get());
        } else {
            SIDEBAR_CONTEXT.isExpanded.set(!SIDEBAR_CONTEXT.isExpanded.get());
        }
    };

    function showBurger() {
        return !VIEWPORT_CONTEXT.isDesktop.get() || SIDEBAR_CONTEXT.isCollapsed.get();
    }

    function onBurgerVisibilityChange($burger: HTMLElement) {
        const visible = showBurger();
        $burger.classList.toggle(styles.burgerCollapsed, !visible);
        $burger.setAttribute('tabindex', visible ? '0' : '-1');
        $burger.setAttribute('aria-hidden', String(!visible));
    }

    function goHome() {
        LIBRARY_CONTEXT.searchQuery.set('');
        if (ultraQueryParams().search) ultraNavigate({ href: '/' });
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
                        component: BurgerIcon({ size: iconSize * 1.5 }),
                        className: [styles.iconBtn, styles.noDrag, styles.burger],
                        attributes: {
                            role: 'button',
                            tabindex: '0',
                            'aria-label': 'Toggle sidebar'
                        },
                        eventHandler: {
                            click: toggleSidebar,
                            keydown: onEnterOrSpace(toggleSidebar)
                        },
                        onMount: [onBurgerVisibilityChange],
                        trigger: [{
                            subscriber: [
                                VIEWPORT_CONTEXT.isDesktop.subscribe,
                                SIDEBAR_CONTEXT.isCollapsed.subscribe
                            ],
                            triggerFunction: onBurgerVisibilityChange
                        }]
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
                            BetterRackIcon({ size: iconSize * 1.3 })
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.text],
                        styles: {
                            userSelect: 'none',
                        },
                        children: [
                            UltraComponent({
                                component: `<span>BetterRack</span>`,
                                className: [styles.title],
                                styles: {
                                    fontSize: '1.5rem'
                                }
                            })
                        ]
                    })

                ]

            }),

            // UltraComponent({
            //     component: '<div></div>',
            //     className: [styles.icons, styles.noDrag],
            //     children: [
            //         HeaderMenu()
            //     ]
            // })

        ]

    })

}
