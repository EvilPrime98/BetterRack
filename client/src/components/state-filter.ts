import { UltraComponent } from "ultra-light.js";
import styles from './state-filter.module.css';

export function StateFilter(){
    return UltraComponent({
        component: '<button>All</button>',
        className: [styles.filterButton]
    })
}
