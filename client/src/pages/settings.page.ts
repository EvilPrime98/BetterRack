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
import { isAndroidPlatform, getStoredServerUrl, hasNativeFolderPicker } from "../services/server-config.service";
import { SERVER_MODAL_CTX } from "../context/server-modal.context";

export function SettingsPage() {

    const [folderError, setFolderError, subsFolderError] = ultraState('');
    const [settingsError, setSettingsError, subsSettingsError] = ultraState('');

    const fieldsState = ultraCompState({
        apiUrl: '',
        baseUrl: '',
        hostDomain: '',
        downloadDir: '',
        folderPath: ''
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
        fieldsState.baseUrl.set(settings.baseUrl);
        fieldsState.hostDomain.set(settings.hostDomain);
        fieldsState.downloadDir.set(settings.downloadDir);
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

    async function onSave() {
        
        const partial: Partial<Omit<IAppSettings, 'outputDirs'>> = {
            apiUrl: fieldsState.apiUrl.get(),
            baseUrl: fieldsState.baseUrl.get(),
            hostDomain: fieldsState.hostDomain.get(),
            downloadDir: fieldsState.downloadDir.get(),
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

                ...(isAndroidPlatform() ? [
                    UltraComponent({

                        component: '<section></section>',

                        className: [styles.section],

                        children: [

                            `<h2 class="${styles.sectionTitle}">Server</h2>`,

                            UltraComponent({
                                component: `<p class="${styles.empty}"></p>`,
                                onMount: [($p: HTMLElement) => {
                                    $p.textContent = getStoredServerUrl() || 'No server configured';
                                }],
                                trigger: [{
                                    subscriber: SERVER_MODAL_CTX.isVisible.subscribe,
                                    triggerFunction: ($p: HTMLElement) => {
                                        if (SERVER_MODAL_CTX.isVisible.get()) return;
                                        $p.textContent = getStoredServerUrl() || 'No server configured';
                                    }
                                }]
                            }),

                            BRButton({
                                text: 'Change server',
                                eventHandler: { click: () => SERVER_MODAL_CTX.openServerModal() }
                            })

                        ]

                    })
                ] : []),

                UltraComponent({

                    component: '<section></section>',

                    className: [styles.section],

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
                                    className: [styles.addBtn],
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

                    className: [styles.section],

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
                                        keydown: (e: Event) => {
                                            const $input = e.target as HTMLInputElement;
                                            fieldsState.apiUrl.set($input.value)
                                        }
                                    }
                                }),

                                TextField({
                                    key: 'baseUrl',
                                    label: 'Base URL',
                                    placeholder: 'https://example.com',
                                    eventHandler: {
                                        keydown: (e: Event) => {
                                            const $input = e.target as HTMLInputElement;
                                            fieldsState.baseUrl.set($input.value)
                                        }
                                    }
                                }),

                                TextField({
                                    key: 'hostDomain',
                                    label: 'Host domain',
                                    placeholder: 'https://example.com',
                                    eventHandler: {
                                        keydown: (e: Event) => {
                                            const $input = e.target as HTMLInputElement;
                                            fieldsState.hostDomain.set($input.value)
                                        }
                                    }
                                }),

                            ]

                        }),

                        BRButton({
                            text: 'Save',
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

    )

}