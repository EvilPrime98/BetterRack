import { UltraComponent } from "ultra-light.js";
import styles from './layout-selector.module.css';

export function LayoutSelector(){
    return UltraComponent({
        component: '<button>Cover</button>',
        className: [styles.layoutButton]
    })
}
