import { UltraComponent, ultraCompState, ultraState } from "ultra-light-js";
import styles from './settings.page.module.css';
import { Layout } from "../layout";
import { SETTINGS_CONTEXT } from "../context/settings.context";
import type { IAppSettings } from "../settings.types";
import { TextField } from "../components/text-field";
import { LibraryFolderRow } from "../components/library-folder-row";
import { toast } from "../services/toast.service";

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

    async function onAddFolder() {
        const value = fieldsState.folderPath.get().trim();
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

            onMount: [syncFields],

            trigger: [{
                subscriber: SETTINGS_CONTEXT.settings.subscribe,
                triggerFunction: syncFields,
                defer: true
            }],

            children: [

                `<h1 class="${styles.title}">Settings</h1>`,

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

                                UltraComponent({
                                    component: `<button type="button">Add folder</button>`,
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
                                    onKeydown: (e: Event) => {
                                        const $input = e.target as HTMLInputElement;
                                        fieldsState.downloadDir.set($input.value)
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
                                    onKeydown: (e: Event) => {
                                        const $input = e.target as HTMLInputElement;
                                        fieldsState.apiUrl.set($input.value)
                                    }
                                }),

                                TextField({
                                    key: 'baseUrl',
                                    label: 'Base URL',
                                    placeholder: 'https://example.com',
                                    onKeydown: (e: Event) => {
                                        const $input = e.target as HTMLInputElement;
                                        fieldsState.baseUrl.set($input.value)
                                    }
                                }),

                                TextField({
                                    key: 'hostDomain',
                                    label: 'Host domain',
                                    placeholder: 'https://example.com',
                                    onKeydown: (e: Event) => {
                                        const $input = e.target as HTMLInputElement;
                                        fieldsState.hostDomain.set($input.value)
                                    }
                                }),

                            ]

                        }),

                        UltraComponent({
                            component: `<button type="button">Save</button>`,
                            className: [styles.saveBtn],
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