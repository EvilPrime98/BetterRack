import { UltraComponent } from "ultra-light-js";
import { DropdownOptions } from "@/components/dropdown/dropdown-options";
import { ItemCounter } from "@/components/item-counter/item-counter";
import { StateFilter } from "@/components/state-filter/state-filter";
import { LayoutSelector } from "@/components/layout/layout-selector";
import { Breadcrumbs } from "@/components/breadcrumbs/breadcrumbs";
import { BRButton } from "@/components/br-button/br-button";
import { FolderIcon } from "@/icons/folder.icon";
import styles from './page-header.module.css';
import type { ILibraryResponseItem, ILibraryFilters } from "@/library.types";
import { NEW_FOLDER_MODAL_CTX } from "@/context/new-folder-modal.context";

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
                            BRButton({
                                text: 'New Folder',
                                variant: 'secondary',
                                className: [styles.newFolderButton],
                                eventHandler: {
                                    click: () => NEW_FOLDER_MODAL_CTX.openNewFolderModal(uid)
                                },
                                children: [FolderIcon({ size: 14 })]
                            }),
                        ]
                    })

                ]
            }),

            ...(uid ? [Breadcrumbs({ uid })] : [])

        ]

    })

}