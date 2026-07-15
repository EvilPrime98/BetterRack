import { UltraComponent, UltraLink } from "ultra-light.js";
import styles from './header.module.css';
import { SearchIcon } from "../icons/search.icon";
import { MenuIcon } from "../icons/menu.icon";
import { SIDEBAR_CONTEXT } from "../context/sidebar.context";
import { BurgerIcon } from "../icons/burger-icon";

export function Header(){

    return UltraComponent({

        component: '<header></header>',

        className: [styles.header],

        children: [

            UltraComponent({

                component: '<div></div>',

                className: [styles.left],

                children: [
                    
                    UltraComponent({
                        component: BurgerIcon({}),
                        eventHandler: {
                            click: () => SIDEBAR_CONTEXT.isExpanded.set(!SIDEBAR_CONTEXT.isExpanded.get())
                        }
                    }),

                    UltraLink({
                        href: '/',
                        children: [
                            '<img src="./comicrack-logo.png" alt="comicrack-logo"/>'
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.text],
                        children: [
                            `<span class="${styles.title}">ComicRack</span>`,
                            `<span class="${styles.subtitle}">Comics</span>`
                        ]
                    })
                    
                ]

            }),

            UltraComponent({
                component: '<div></div>',
                className: [styles.icons],
                children: [
                    SearchIcon({ size: 18 }),
                    MenuIcon({ size: 18 })
                ]
            })

        ]

    })

}
