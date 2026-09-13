import { UltraComponent } from "ultra-light-js";
import styles from './sidebar.module.css';
import { LIBRARY_METADATA_CONTEXT } from "../../context/library-metadata.context";
import { LIBRARY_METADATA_FIELDS, LIBRARY_METADATA_FIELD_LABELS, type TLibraryGroupMode } from "../../library.types";

const OPTIONS: { mode: TLibraryGroupMode; label: string }[] = [
    { mode: 'folder', label: 'Folder' },
    { mode: LIBRARY_METADATA_FIELDS.series, label: LIBRARY_METADATA_FIELD_LABELS.series },
    { mode: LIBRARY_METADATA_FIELDS.writer, label: LIBRARY_METADATA_FIELD_LABELS.writer },
    { mode: LIBRARY_METADATA_FIELDS.year, label: LIBRARY_METADATA_FIELD_LABELS.year },
];

export function GroupModeSelect() {

    function onModeChange($nav: HTMLElement) {
        const current = LIBRARY_METADATA_CONTEXT.mode.get();
        $nav.querySelectorAll(`.${styles.modeOption}`).forEach($btn => {
            $btn.classList.toggle(styles.modeOptionActive, $btn.getAttribute('data-mode') === current);
        });
    }

    return UltraComponent({

        component: '<div></div>',

        className: [styles.modeSelect],

        onMount: [onModeChange],

        trigger: [{
            subscriber: LIBRARY_METADATA_CONTEXT.mode.subscribe,
            triggerFunction: onModeChange
        }],

        children: OPTIONS.map(({ mode, label }) => UltraComponent({
            component: `<button type="button" class="${styles.modeOption}" data-mode="${mode}"><span>${label}</span></button>`,
            eventHandler: { click: () => LIBRARY_METADATA_CONTEXT.setMode(mode) }
        }))

    });

}
