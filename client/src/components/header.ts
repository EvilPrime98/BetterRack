import { UltraComponent, UltraLink, ultraNavigate, ultraQueryParams } from "ultra-light-js";
import styles from './header.module.css';
import { SIDEBAR_CONTEXT } from "../context/sidebar.context";
import { BurgerIcon } from "../icons/burger-icon";
import { BetterRackIcon } from "../icons/better-rack.icon";
import { ShopIcon } from "../icons/shop.icon";
import { GearIcon } from "../icons/gear.icon";
import { LIBRARY_CONTEXT } from "../context/library.context";
import { HeaderMenu } from "./header-menu";

export function Header() {

    const iconSize = 30;

    function toggleSidebar() {
        SIDEBAR_CONTEXT.isExpanded.set(!SIDEBAR_CONTEXT.isExpanded.get())
    };

    function goToStore() {
        ultraNavigate({ href: '/store' });
    }

    function goToSettings() {
        ultraNavigate({ href: '/settings' });
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

            UltraComponent({
                component: '<div></div>',
                className: [styles.icons, styles.noDrag],
                children: [

                    UltraComponent({
                        component: ShopIcon({ size: iconSize }),
                        className: [styles.iconBtn],
                        attributes: {
                            role: 'button',
                            tabindex: '0',
                            'aria-label': 'Store'
                        },
                        eventHandler: {
                            click: goToStore,
                            keydown: onEnterOrSpace(goToStore)
                        }
                    }),

                    UltraComponent({
                        component: GearIcon({ size: iconSize }),
                        className: [styles.iconBtn],
                        attributes: {
                            role: 'button',
                            tabindex: '0',
                            'aria-label': 'Settings'
                        },
                        eventHandler: {
                            click: goToSettings,
                            keydown: onEnterOrSpace(goToSettings)
                        }
                    }),

                    HeaderMenu()

                ]
            })

        ]

    })

}
