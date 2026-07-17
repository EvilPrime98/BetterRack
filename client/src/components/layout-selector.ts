import { UltraComponent } from "ultra-light-js";
import styles from './layout-selector.module.css';
import { COMICS_TYPE_CTX } from "../context/comics-types.context";

export function LayoutSelector(){

    const onTypeChange = ($button: HTMLElement) => {
        $button.textContent = COMICS_TYPE_CTX.type.get();
    }
    
    return UltraComponent({
        component: '<button></button>',
        className: [styles.layoutButton],
        eventHandler: {
            click: COMICS_TYPE_CTX.next
        },
        onMount: [onTypeChange],
        trigger: [{
            subscriber: COMICS_TYPE_CTX.type.subscribe,
            triggerFunction: onTypeChange
        }]
    })

}
