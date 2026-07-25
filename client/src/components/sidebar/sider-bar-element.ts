import { UltraComponent, UltraLink } from "ultra-light-js";
import { FolderIcon } from "../../icons/folder.icon";
import { SIDEBAR_CONTEXT } from "../../context/sidebar.context";
import type { ILibraryResponseItem } from "../../library.types";
import styles from './sidebar.module.css'; 

export function SideBarElement({
    item
}:{
    item: ILibraryResponseItem
}) {

    const closeSidebar = () => SIDEBAR_CONTEXT.isExpanded.set(false);
    
    return UltraComponent({
        component: UltraLink({
            href: `/${item.uid}`,
            className: [styles.item],
            children: [
                FolderIcon({ size: 16 }),
                `<span>${item.name}</span>`
            ]
        }),
        eventHandler: {
            click: closeSidebar
        }
    })

}