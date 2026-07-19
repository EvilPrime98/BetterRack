import { UltraComponent } from "ultra-light-js";
import { DropdownOptions } from "./dropdown-options";
import { ItemCounter } from "./item-counter";
import { StateFilter } from "./state-filter";
import { LayoutSelector } from "./layout-selector";
import styles from './page-header.module.css';
import type { ILibraryResponseItem, ILibraryFilters } from "../library.types";

export function PageHeader({
    items,
    subsItems,
    filters,
    resetFilters
}:{
    items: () => ILibraryResponseItem[];
    subsItems: (fn: (value: ILibraryResponseItem[]) => void) => () => void;
    filters: ILibraryFilters;
    resetFilters: () => void;
}) {

    return UltraComponent({

        component: '<header></header>',
        className: [styles.pageHeader],

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.left],
                children: [
                    DropdownOptions({ filters, resetFilters }),
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