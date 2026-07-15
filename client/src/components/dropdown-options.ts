import { UltraComponent } from "ultra-light.js";
import styles from './dropdown-options.module.css';
import { ChevronDownIcon } from "../icons/chevron.icon";

export function DropdownOptions(){

    return UltraComponent({

        component: '<div></div>',

        className: [styles.dropdown],

        children: [
            `<span class="${styles.label}">All Comics</span>`,
            ChevronDownIcon({ size: 14 })
            //actual dropdown menu
        ]

    })

}
