import { UltraComponent } from "ultra-light-js";
import { DropdownOptions } from "@/components/dropdown/dropdown-options";
import { ItemCounter } from "@/components/item-counter/item-counter";
import { StateFilter } from "@/components/state-filter/state-filter";
import { LayoutSelector } from "@/components/layout/layout-selector";
import { Breadcrumbs } from "@/components/breadcrumbs/breadcrumbs";
import styles from './page-header.module.css';
import type { ILibraryResponseItem, ILibraryFilters } from "@/library.types";

export function PageHeader({
    uid,
    items,
    subsItems,
    filters,
    resetFilters
}:{
    uid?: string;
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
                className: [styles.filtersRow],
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
            }),

            ...(uid ? [Breadcrumbs({ uid })] : [])

        ]

    })

}