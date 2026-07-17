import { UltraComponent } from "ultra-light-js";
import styles from './state-filter.module.css';
import { READ_TYPES_CTX } from "../context/read-types.context";

export function StateFilter(){

    const onTypeChange = ($button: HTMLElement) => {
        $button.textContent = READ_TYPES_CTX.type.get();
    }

    return UltraComponent({
        component: '<button></button>',
        className: [styles.filterButton],
        onMount: [onTypeChange],
        trigger: [{
            subscriber: READ_TYPES_CTX.type.subscribe,
            triggerFunction: onTypeChange
        }],
        eventHandler: {
            click: READ_TYPES_CTX.next
        }
    })
    
}
