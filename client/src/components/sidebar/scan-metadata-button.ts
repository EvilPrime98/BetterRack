import { UltraActivity, UltraComponent } from "ultra-light-js";
import styles from './sidebar.module.css';
import { LIBRARY_METADATA_CONTEXT } from "../../context/library-metadata.context";

export function ScanMetadataButton() {

    function scan() {
        LIBRARY_METADATA_CONTEXT.scanAndLoad();
    }

    function onScanningChange($button: HTMLElement) {
        const scanning = LIBRARY_METADATA_CONTEXT.isScanning.get();
        $button.classList.toggle(styles.spinning, scanning);
        ($button as HTMLButtonElement).disabled = scanning;
        const progress = LIBRARY_METADATA_CONTEXT.scanProgress.get();
        const $label = $button.querySelector('span:last-child');
        if ($label) {
            $label.textContent = scanning && progress
                ? `Scanning… ${progress.scanned}/${progress.total}`
                : 'Scan Library';
        }
    }

    return UltraActivity({

        mode: {
            state: () => LIBRARY_METADATA_CONTEXT.mode.get() !== 'folder',
            subscriber: LIBRARY_METADATA_CONTEXT.mode.subscribe
        },

        component: UltraComponent({
            onMount: [onScanningChange],
            component: '<button type="button"></button>',
            className: [styles.refreshButton],
            attributes: { 'aria-label': 'Scan library metadata' },
            eventHandler: { click: scan },
            children: [
                `<span class="${styles.refreshSpinner}"></span>`,
                `<span>Scan Library</span>`
            ],
            trigger: [
                { subscriber: LIBRARY_METADATA_CONTEXT.isScanning.subscribe, triggerFunction: onScanningChange },
                { subscriber: LIBRARY_METADATA_CONTEXT.scanProgress.subscribe, triggerFunction: onScanningChange }
            ]
        })

    });

}
