import { UltraComponent, ultraCompState, ultraState } from "ultra-light-js";
import styles from './settings.page.module.css';
import { Layout } from "../layout";
import { SETTINGS_CONTEXT } from "../context/settings.context";
import type { IAppSettings } from "../settings.types";
import { TextField } from "../components/text-field/text-field";
import { LibraryFolderRow } from "@/components/library-folder-row/library-folder-row";
import { toast } from "../services/toast.service";
import { DOCUMENT_TITLE_CONTEXT } from "../context/document-title.context";
import { BRButton } from "../components/br-button/br-button";
import { clearRemoteServer, getStoredServerUrl, hasNativeFolderPicker, isDesktopApp, isRemoteModeEnabled } from "../services/server-config.service";
import { LIBRARY_CONTEXT } from "../context/library.context";
import { SERVER_MODAL_CTX } from "../context/server-modal.context";
import { CONFIRM_MODAL_CTX } from "../context/confirm-modal.context";

export function SettingsPage() {

    const [folderError, setFolderError, subsFolderError] = ultraState('');
    const [settingsError, setSettingsError, subsSettingsError] = ultraState('');

    const fieldsState = ultraCompState({
        apiUrl: '',
        downloadDir: '',
        folderPath: '',
        identifyFromMeta: false
    })

    function onFolderError($p: HTMLElement) {
        $p.textContent = folderError();
    }

    function onSettingsError($p: HTMLElement) {
        $p.textContent = settingsError();
    }

    function clearFolderError() {
        setFolderError('');
    }

    function syncFields() {
        const settings = SETTINGS_CONTEXT.settings.get();
        fieldsState.apiUrl.set(settings.apiUrl);
        fieldsState.downloadDir.set(settings.downloadDir);
        fieldsState.identifyFromMeta.set(settings.identifyFromMeta);
    }

    function syncIdentifyFromMetaCheckbox($el: HTMLElement) {
        const $checkbox = $el.querySelector('input') as HTMLInputElement;
        $checkbox.checked = fieldsState.identifyFromMeta.get();
    }

    function renderFolders(
        $ul: HTMLElement
    ) {
        const dirs = SETTINGS_CONTEXT.settings.get().outputDirs;
        $ul.replaceChildren(
            ...(dirs.length === 0
                ? [
                    UltraComponent({
                        component: `<li class="${styles.empty}">No library folders configured yet.</li>`
                    })
                ]
                : dirs.map(dir =>
                    LibraryFolderRow({
                        dir,
                        clearFolderError,
                        setFolderError
                    })
                )
            )
        );
    }

    async function addFolder(rawValue: string) {
        const value = rawValue.trim();
        if (!value) return;
        clearFolderError();
        try {
            await SETTINGS_CONTEXT.addLibraryFolder(value);
            fieldsState.folderPath.set('');
            toast.success('Folder added');
        } catch (e) {
            const message = e instanceof Error
                ? e.message
                : 'There was an error adding the folder.';
            setFolderError(message);
            toast.error(message);
        }
    }

    function onAddFolder() {
        addFolder(fieldsState.folderPath.get());
    }

    async function onBrowseFolder() {
        const picker = window.desktop?.pickLibraryFolder;
        if (!picker) return;
        clearFolderError();
        let selected: string | null;
        try {
            selected = await picker();
        } catch (e) {
            const message = e instanceof Error
                ? e.message
                : 'Could not open the folder picker.';
            setFolderError(message);
            toast.error(message);
            return;
        }
        if (selected) addFolder(selected);
    }

    async function onReidentifyAll() {
        const confirmed = await CONFIRM_MODAL_CTX.confirmDialog({
            title: 'Re-identify all comics?',
            message: 'This will re-run identification for every comic in your library, overwriting any existing matches.',
            confirmLabel: 'Re-identify'
        });
        if (!confirmed) return;
        LIBRARY_CONTEXT.reidentifyAll();
    }

    async function onUnlinkServer() {
        const confirmed = await CONFIRM_MODAL_CTX.confirmDialog({
            title: 'Unlink from remote server?',
            message: 'The app will disconnect from the remote server and go back to your local library.',
            confirmLabel: 'Unlink'
        });
        if (!confirmed) return;
        clearRemoteServer();
        window.location.reload();
    }

    async function onSave() {
        
        const partial: Partial<Omit<IAppSettings, 'outputDirs'>> = {
            apiUrl: fieldsState.apiUrl.get(),
            downloadDir: fieldsState.downloadDir.get(),
            identifyFromMeta: fieldsState.identifyFromMeta.get(),
        };

        setSettingsError('');

        try {
            await SETTINGS_CONTEXT.updateSettings(partial);
            toast.success('Settings saved');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Something went wrong.';
            setSettingsError(message);
            toast.error(message);
        }

    }

    return Layout(

        UltraComponent({

            component: '<section></section>',

            className: [styles.page],

            onMount: [syncFields, () => DOCUMENT_TITLE_CONTEXT.setTitle('Settings')],

            trigger: [{
                subscriber: SETTINGS_CONTEXT.settings.subscribe,
                triggerFunction: syncFields,
                defer: true
            }],

            children: [

                `<h1 class="${styles.title}">Settings</h1>`,

                UltraComponent({

                    component: '<div></div>',

                    className: [styles.grid],

                    children: [

                UltraComponent({

                    component: '<section></section>',

                    className: [styles.section, styles.colLeft],

                    children: [

                        `<h2 class="${styles.sectionTitle}">Server</h2>`,

                        UltraComponent({
                            component: `<p class="${styles.empty}"></p>`,
                            onMount: [($p: HTMLElement) => {
                                $p.textContent = getStoredServerUrl() || 'No server configured';
                            }],
                            trigger: [
                                {
                                    subscriber: SERVER_MODAL_CTX.isVisible.subscribe,
                                    triggerFunction: ($p: HTMLElement) => {
                                        if (SERVER_MODAL_CTX.isVisible.get()) return;
                                        $p.textContent = getStoredServerUrl() || 'No server configured';
                                    }
                                }
                            ]
                        }),

                        BRButton({
                            text: 'Change server',
                            eventHandler: { click: () => SERVER_MODAL_CTX.openServerModal() }
                        }),

                        ...(isDesktopApp() && isRemoteModeEnabled() ? [
                            BRButton({
                                text: 'Unlink server',
                                variant: 'secondary',
                                eventHandler: { click: onUnlinkServer }
                            })
                        ] : [])

                    ]

                }),

                UltraComponent({

                    component: '<section></section>',

                    className: [styles.section, styles.colLeft],

                    children: [

                        `<h2 class="${styles.sectionTitle}">Library folders</h2>`,

                        UltraComponent({
                            component: `<ul class="${styles.folderList}"></ul>`,
                            onMount: [renderFolders],
                            trigger: [{
                                subscriber: SETTINGS_CONTEXT.settings.subscribe,
                                triggerFunction: renderFolders,
                                defer: true
                            }]
                        }),

                        UltraComponent({
                            
                            component: '<div></div>',
                            
                            className: [styles.addRow],
                            
                            children: [
                                
                                UltraComponent({
                                    component: '<input type="text" />',
                                    className: [styles.input],
                                    attributes: {
                                        placeholder: 'Folder path',
                                        'aria-label': 'Folder path'
                                    },
                                    trigger: [{
                                        subscriber: fieldsState.folderPath.subscribe,
                                        triggerFunction: ($el: HTMLElement) => {
                                            ($el as HTMLInputElement).value = fieldsState.folderPath.get();
                                        }
                                    }],
                                    eventHandler: {
                                        input: (e: Event) => {
                                            const $input = e.target as HTMLInputElement;
                                            fieldsState.folderPath.set($input.value);
                                        },
                                        keydown: (e: Event) => {
                                            const kE = e as KeyboardEvent;
                                            if (kE.key === 'Enter') onAddFolder();
                                        }
                                    }
                                }),

                                ...(hasNativeFolderPicker() ? [
                                    BRButton({
                                        text: 'Browse…',
                                        variant: 'secondary',
                                        className: [styles.browseBtn],
                                        eventHandler: { click: onBrowseFolder }
                                    })
                                ] : []),

                                BRButton({
                                    text: 'Add Folder',
                                    eventHandler: { click: onAddFolder }
                                })
                            ]

                        }),

                        UltraComponent({
                            component: `<p class="${styles.errorText}"></p>`,
                            trigger: [{
                                subscriber: subsFolderError,
                                triggerFunction: onFolderError
                            }]
                        })

                    ]
                }),

                UltraComponent({

                    component: '<section></section>',

                    className: [styles.section, styles.colRight],

                    children: [

                        UltraComponent({

                            component: '<div></div>',

                            className: [styles.fieldGroup],

                            children: [

                                `<h2 class="${styles.sectionTitle}">Downloads</h2>`,

                                TextField({
                                    key: 'downloadDir',
                                    label: 'Download folder',
                                    placeholder: '/path/to/downloads',
                                    eventHandler: {
                                        input: (e: Event) => {
                                            const $input = e.target as HTMLInputElement;
                                            fieldsState.downloadDir.set($input.value)
                                        }
                                    }
                                }),

                            ]

                        }),

                        UltraComponent({

                            component: '<div></div>',

                            className: [styles.fieldGroup],

                            children: [

                                `<h2 class="${styles.sectionTitle} ${styles.groupDivider}">API configuration</h2>`,

                                TextField({
                                    key: 'apiUrl',
                                    label: 'API URL',
                                    placeholder: 'https://example.com/wp-json/wp/v2',
                                    eventHandler: {
                                        input: (e: Event) => {
                                            const $input = e.target as HTMLInputElement;
                                            fieldsState.apiUrl.set($input.value)
                                        }
                                    }
                                }),

                            ]

                        }),

                        UltraComponent({

                            component: '<div></div>',

                            className: [styles.fieldGroup],

                            children: [

                                `<h2 class="${styles.sectionTitle} ${styles.groupDivider}">Identification</h2>`,

                                UltraComponent({
                                    component: `<div class="${styles.toggleRow}">
                                        <label class="${styles.toggleLabel}"><input type="checkbox" /> Identify from metadata</label>
                                        <span class="${styles.infoIcon}" tabindex="0">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="16" x2="12" y2="12" />
                                                <line x1="12" y1="8" x2="12.01" y2="8" />
                                            </svg>
                                            <span class="${styles.infoTooltip}" role="tooltip">Reads ComicInfo.xml when present, otherwise uses the wiki.</span>
                                        </span>
                                    </div>`,
                                    onMount: [($el: HTMLElement) => {
                                        syncIdentifyFromMetaCheckbox($el);
                                        $el.querySelector('input')?.addEventListener(
                                            'change',
                                            (e) => fieldsState.identifyFromMeta.set((e.currentTarget as HTMLInputElement).checked)
                                        );
                                    }],
                                    trigger: [{
                                        subscriber: fieldsState.identifyFromMeta.subscribe,
                                        triggerFunction: syncIdentifyFromMetaCheckbox
                                    }]
                                }),

                                BRButton({
                                    text: 'Re-identify all',
                                    variant: 'secondary',
                                    styles: { width: 'fit-content' },
                                    eventHandler: { click: onReidentifyAll }
                                }),

                            ]

                        }),

                        BRButton({
                            text: 'Save',
                            className: [styles.saveButton],
                            eventHandler: { click: onSave }
                        }),

                        UltraComponent({
                            component: `<p class="${styles.errorText}"></p>`,
                            trigger: [{
                                subscriber: subsSettingsError,
                                triggerFunction: onSettingsError
                            }]
                        })

                    ]

                })

                    ]

                })

            ]

        })

    )

}