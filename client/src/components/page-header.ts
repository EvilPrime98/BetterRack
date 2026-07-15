import { UltraComponent } from "ultra-light.js";
import { DropdownOptions } from "./dropdown-options";
import { ItemCounter } from "./item-counter";
import { StateFilter } from "./state-filter";
import { LayoutSelector } from "./layout-selector";
import styles from './page-header.module.css';
import type { ILibraryResponseItem } from "../library.types";

export function PageHeader({
    items,
    subsItems
}:{
    items: () => ILibraryResponseItem[],
    subsItems: (fn: (value: ILibraryResponseItem[]) => void) => () => void
}) {

    return UltraComponent({

        component: '<header></header>',
        className: [styles.pageHeader],

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.left],
                children: [
                    DropdownOptions(),
                    ItemCounter({ items, subsItems }),
                ]
            }),

            UltraComponent({
                component: '<div></div>',
                className: [styles.right],
                children: [
                    StateFilter(),
                    LayoutSelector(),
                ]
            })

        ]

    })

}