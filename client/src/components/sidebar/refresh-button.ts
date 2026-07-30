import { UltraComponent } from "ultra-light-js";
import { LIBRARY_CONTEXT } from "../../context/library.context";
import styles from './sidebar.module.css';

export function RefreshLibraryButton() {

    function refreshLibrary(){ 
        LIBRARY_CONTEXT.refreshLibrary() 
    };

    function onRefreshingChange($button: HTMLElement) {
        $button.classList.toggle(
            styles.spinning,
            LIBRARY_CONTEXT.queryClient.get().isFetching()
        );
    }

    return UltraComponent({
        onMount: [onRefreshingChange],
        component: '<button></button>',
        className: [styles.refreshButton],
        attributes: { 'aria-label': 'Refresh library' },
        eventHandler: { click: refreshLibrary },
        children: [
            `<span class="${styles.refreshSpinner}"></span>`,
            `<span>Refresh Libraries</span>`
        ],
        trigger: [{
            subscriber: LIBRARY_CONTEXT.queryClient.get().subscribeToFetching,
            triggerFunction: onRefreshingChange
        }]
    })

}