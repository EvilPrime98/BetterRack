import { UltraActivity, UltraComponent } from "ultra-light-js";
import styles from './folder-prefs-modal.module.css';
import { BRButton } from "@/components/br-button/br-button";
import { FOLDER_PREFS_MODAL_CTX } from "@/context/folder-prefs-modal.context";

export function FolderPrefsModal() {

    let $publisher: HTMLInputElement | null = null;
    let $recursive: HTMLInputElement | null = null;
    let $cover: HTMLInputElement | null = null;

    const cancel = () => FOLDER_PREFS_MODAL_CTX.closeFolderPrefsModal();

    const submit = () => {
        if (!$publisher || !$recursive || !$cover) return;
        FOLDER_PREFS_MODAL_CTX.saveFolderPrefs({
            prefPublisher: $publisher.value.trim(),
            recursive: $recursive.checked,
            prefCover: $cover.value.trim()
        });
    }

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cancel();
    }

    const onValuesChange = () => {
        if ($publisher) $publisher.value = FOLDER_PREFS_MODAL_CTX.prefPublisher.get();
        if ($recursive) $recursive.checked = FOLDER_PREFS_MODAL_CTX.recursive.get();
        if ($cover) $cover.value = FOLDER_PREFS_MODAL_CTX.prefCover.get();
    }

    return UltraActivity({

        mode: {
            state: FOLDER_PREFS_MODAL_CTX.isVisible.get,
            subscriber: FOLDER_PREFS_MODAL_CTX.isVisible.subscribe
        },

        component: '<div></div>',

        className: [styles.overlay],

        onMount: [
            () => {
                document.addEventListener('keydown', onKeydown);
                return () => document.removeEventListener('keydown', onKeydown);
            }
        ],

        trigger: [
            {
                subscriber: [
                    FOLDER_PREFS_MODAL_CTX.prefPublisher.subscribe,
                    FOLDER_PREFS_MODAL_CTX.recursive.subscribe,
                    FOLDER_PREFS_MODAL_CTX.prefCover.subscribe
                ],
                triggerFunction: onValuesChange,
                defer: true
            }
        ],

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.backdrop],
                eventHandler: { click: cancel }
            }),

            UltraComponent({

                component: '<div></div>',

                attributes: {
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': 'Folder preferences'
                },

                className: [styles.modal],

                children: [

                    UltraComponent({
                        component: `<p class="${styles.title}">Folder preferences</p>`,
                        trigger: [{
                            subscriber: FOLDER_PREFS_MODAL_CTX.folderName.subscribe,
                            triggerFunction: ($p: HTMLElement) => {
                                $p.textContent = `Preferences — ${FOLDER_PREFS_MODAL_CTX.folderName.get()}`;
                            }
                        }],
                        onMount: [
                            ($p: HTMLElement) => {
                                $p.textContent = `Preferences — ${FOLDER_PREFS_MODAL_CTX.folderName.get()}`;
                            }
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.field],
                        children: [
                            `<label class="${styles.label}">Preferred publisher</label>`,
                            UltraComponent({
                                component: '<input/>',
                                className: [styles.input],
                                attributes: {
                                    type: 'text',
                                    placeholder: 'e.g. DC Comics'
                                },
                                onMount: [
                                    ($el) => { $publisher = $el as HTMLInputElement; }
                                ]
                            })
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.field],
                        children: [
                            `<label class="${styles.label}">Preferred cover</label>`,
                            UltraComponent({
                                component: '<input/>',
                                className: [styles.input],
                                attributes: {
                                    type: 'text',
                                    placeholder: 'Cover image URL'
                                },
                                onMount: [
                                    ($el) => { $cover = $el as HTMLInputElement; }
                                ]
                            })
                        ]
                    }),

                    UltraComponent({
                        component: `<label class="${styles.checkboxRow}"></label>`,
                        children: [
                            UltraComponent({
                                component: '<input/>',
                                attributes: { type: 'checkbox' },
                                onMount: [
                                    ($el) => { $recursive = $el as HTMLInputElement; }
                                ]
                            }),
                            '<span>Apply to subfolders</span>'
                        ]
                    }),

                    `<p class="${styles.hint}">Subfolders without their own preferred publisher will inherit this one.</p>`,

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.actions],
                        children: [
                            BRButton({
                                text: 'Cancel',
                                variant: 'secondary',
                                eventHandler: { click: cancel }
                            }),
                            BRButton({
                                text: 'Save',
                                variant: 'primary',
                                eventHandler: { click: submit }
                            })
                        ]
                    })

                ]
            })

        ]
    })

}
