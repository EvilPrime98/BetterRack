import { UltraComponent } from "ultra-light-js";
import { CloseIcon } from "../../icons/close.icon";
import styles from './sidebar.module.css';
import { SIDEBAR_CONTEXT } from "../../context/sidebar.context";

export function SidebarCloseButton() {
    
    function closeSidebar(){ 
        SIDEBAR_CONTEXT.isExpanded.set(false) 
    };

    return UltraComponent({
        component: CloseIcon({ size: 20 }),
        className: [styles.button],
        attributes: { role: 'button' },
        eventHandler: { click: closeSidebar }
    })

}
