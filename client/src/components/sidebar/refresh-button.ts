import { UltraComponent } from "ultra-light-js";
import { LIBRARY_CONTEXT } from "../../context/library.context";
import { RefreshIcon } from "../../icons/refresh-icon";
import styles from './sidebar.module.css';

export function RefreshLibraryButton() {

    function refreshLibrary(){ LIBRARY_CONTEXT.refreshLibrary() };
    
    function onRefreshingChange($button: HTMLElement) {
        $button.classList.toggle(
            styles.spinning,
            LIBRARY_CONTEXT.queryClient.get().isFetching()
        );
    }

    return UltraComponent({
        onMount: [onRefreshingChange],
        component: RefreshIcon({ size: 20 }),
        className: [styles.button],
        attributes: { role: 'button', 'aria-label': 'Refresh library' },
        eventHandler: { click: refreshLibrary },
        trigger: [{
            subscriber: LIBRARY_CONTEXT.queryClient.get().subscribeToFetching,
            triggerFunction: onRefreshingChange
        }]
    })

}