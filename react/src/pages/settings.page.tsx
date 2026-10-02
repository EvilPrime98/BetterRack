import { useEffect, useState } from 'react';
import styles from './settings.page.module.css';
import { Layout } from '@/layout';
import { useSettingsStore } from '@/stores/settings.store';
import type { IAppSettings } from '@/settings.types';
import { TextField } from '@/components/text-field/text-field';
import { LibraryFolderRow } from '@/components/library-folder-row/library-folder-row';
import { toast } from '@/services/toast.service';
import { useDocumentTitleStore } from '@/stores/documentTitle.store';
import { BRButton } from '@/components/br-button/br-button';
import { BRCheckbox } from '@/components/br-checkbox/br-checkbox';
import { clearRemoteServer, getStoredServerUrl, hasNativeFolderPicker, isRemoteModeEnabled } from '@/services/server-config.service';
import { useLibraryStore } from '@/stores/library.store';
import { useServerModalStore } from '@/stores/serverModal.store';
import { useConfirmModalStore } from '@/stores/confirmModal.store';

export function SettingsPage() {

    const settings = useSettingsStore((s) => s.settings);
    const setTitle = useDocumentTitleStore((s) => s.setTitle);
    const [folderError, setFolderError] = useState('');
    const [settingsError, setSettingsError] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [draft, setDraft] = useState({
        apiUrl: settings.apiUrl,
        downloadDir: settings.downloadDir,
        wikiSearch: settings.wikiSearch,
        rescanOnStartup: settings.rescanOnStartup,
    });

    function clearFolderError() {
        setFolderError('');
    }

    async function addFolder(rawValue: string) {
        const value = rawValue.trim();
        if (!value) return;
        clearFolderError();
        try {
            await useSettingsStore.getState().addLibraryFolder(value);
            setFolderPath('');
            toast.success('Folder added');
            useLibraryStore.getState().refreshLibrary({ silent: true });
        } catch (e) {
            const message = e instanceof Error
                ? e.message
                : 'There was an error adding the folder.';
            setFolderError(message);
            toast.error(message);
        }
    }

    function onAddFolder() {
        addFolder(folderPath);
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

    async function onBrowseDownloadDir() {
        const picker = window.desktop?.pickLibraryFolder;
        if (!picker) return;
        try {
            const selected = await picker();
            if (selected) setDraft((d) => ({ ...d, downloadDir: selected }));
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not open the folder picker.');
        }
    }

    async function onReidentifyAll() {
        const confirmed = await useConfirmModalStore.getState().confirmDialog({
            title: 'Re-identify all comics?',
            message: 'This will re-run identification for every comic in your library, overwriting any existing matches.',
            confirmLabel: 'Re-identify'
        });
        if (!confirmed) return;
        useLibraryStore.getState().reidentifyAll();
    }

    async function onUnlinkServer() {
        const confirmed = await useConfirmModalStore.getState().confirmDialog({
            title: 'Unlink from remote server?',
            message: 'The app will disconnect from the remote server and go back to your local library.',
            confirmLabel: 'Unlink'
        });
        if (!confirmed) return;
        clearRemoteServer();
        window.location.reload();
    }

    async function onSave() {

        const partial: Partial<Omit<IAppSettings, 'outputDirs'>> = { ...draft };

        setSettingsError('');

        try {
            await useSettingsStore.getState().updateSettings(partial);
            toast.success('Settings saved');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Something went wrong.';
            setSettingsError(message);
            toast.error(message);
        }

    }

    useEffect(() => {
        setTitle('Settings');
    }, [setTitle]);

    useEffect(() => {
        setDraft({
            apiUrl: settings.apiUrl,
            downloadDir: settings.downloadDir,
            wikiSearch: settings.wikiSearch,
            rescanOnStartup: settings.rescanOnStartup,
        });
    }, [settings]);

    return (
        <Layout>
            <section className={styles.page}>

                <header className={styles.header}>

                    <h1 className={styles.title}>Settings</h1>

                    <div className={styles.headerActions}>

                        <p className={styles.errorText}>{settingsError}</p>

                        <BRButton
                            text="Save"
                            onClick={onSave}
                        />

                    </div>

                </header>

                <div className={styles.grid}>

                    <div className={styles.column}>

                        <section className={styles.section}>

                            <h2 className={styles.sectionTitle}>Server</h2>

                            <p className={styles.empty}>
                                {getStoredServerUrl()
                                    || 'No server configured'}
                            </p>

                            <BRButton
                                text="Change server"
                                onClick={() => useServerModalStore.getState().openServerModal()}
                            />

                            {isRemoteModeEnabled() && (
                                <BRButton
                                    text="Unlink server"
                                    variant="secondary"
                                    onClick={onUnlinkServer}
                                />
                            )}

                        </section>

                        <section className={styles.section}>

                            <div className={styles.fieldGroup}>

                                <h2 className={styles.sectionTitle}>Downloads</h2>

                                <div className={styles.field}>

                                    <label className={styles.label} htmlFor="settings-downloadDir">Download folder</label>

                                    <div className={styles.addRow}>

                                        <input
                                            id="settings-downloadDir"
                                            type="text"
                                            className={styles.input}
                                            placeholder="/path/to/downloads"
                                            value={draft.downloadDir ?? ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, downloadDir: e.target.value }))}
                                        />

                                        {hasNativeFolderPicker() && (
                                            <BRButton
                                                text="Browse…"
                                                variant="secondary"
                                                className={styles.browseBtn}
                                                onClick={onBrowseDownloadDir}
                                            />
                                        )}

                                    </div>

                                </div>

                            </div>

                        </section>

                        <section className={styles.section}>

                            <div className={styles.fieldGroup}>

                                <h2 className={styles.sectionTitle}>Store configuration</h2>

                                <TextField
                                    fieldKey="apiUrl"
                                    label="API URL"
                                    placeholder="https://example.com/wp-json/wp/v2"
                                    onChange={(e) => setDraft((d) => ({ ...d, apiUrl: (e.target as HTMLInputElement).value }))}
                                />

                            </div>

                        </section>

                    </div>

                    <div className={styles.column}>

                        <section className={`${styles.section}`}>

                            <h2 className={styles.sectionTitle}>Library folders</h2>

                            <ul className={styles.folderList}>
                                {settings.outputDirs.length === 0
                                    ? <li className={styles.empty}>No library folders configured yet.</li>
                                    : settings.outputDirs.map(dir => (
                                        <LibraryFolderRow
                                            key={dir}
                                            dir={dir}
                                            clearFolderError={clearFolderError}
                                            setFolderError={setFolderError}
                                        />
                                    ))
                                }
                            </ul>

                            <div className={styles.addRow}>

                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Folder path"
                                    aria-label="Folder path"
                                    value={folderPath}
                                    onChange={(e) => setFolderPath(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') onAddFolder(); }}
                                />

                                {hasNativeFolderPicker() && (
                                    <BRButton
                                        text="Browse…"
                                        variant="secondary"
                                        className={styles.browseBtn}
                                        onClick={onBrowseFolder}
                                    />
                                )}

                                <BRButton
                                    text="Add Folder"
                                    onClick={onAddFolder}
                                />

                            </div>

                            <p className={styles.errorText}>{folderError}</p>

                        </section>

                        <section className={styles.section}>

                            <div className={styles.fieldGroup}>

                                <h2 className={styles.sectionTitle}>Identification</h2>

                                <div className={styles.toggleRow}>

                                    <BRCheckbox
                                        text="Search the wiki for metadata"
                                        checked={draft.wikiSearch}
                                        onChange={(e) => {
                                            const checked = e.currentTarget.checked;
                                            setDraft((d) => ({ ...d, wikiSearch: checked }));
                                        }}
                                    />

                                    <span
                                        className={styles.infoIcon}
                                        tabIndex={0}
                                    >
                                        <svg
                                            width={16}
                                            height={16}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#fff"
                                            strokeWidth={1.5}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <circle cx={12} cy={12} r={10} />
                                            <line x1={12} y1={16} x2={12} y2={12} />
                                            <line x1={12} y1={8} x2={12.01} y2={8} />
                                        </svg>
                                        <span
                                            className={styles.infoTooltip}
                                            role="tooltip"
                                        >
                                            Comics are always identified from ComicInfo.xml. When enabled, comics without it are looked up on the wiki.
                                        </span>
                                    </span>

                                    <BRButton
                                        className={styles.reidentifyBtn}
                                        variant="secondary"
                                        text="Re-identify all"
                                        onClick={onReidentifyAll}
                                    />

                                </div>

                                <div className={styles.toggleRow}>

                                    <BRCheckbox
                                        text="Re-scan on start up"
                                        checked={draft.rescanOnStartup}
                                        onChange={(e) => {
                                            const checked = e.currentTarget.checked;
                                            setDraft((d) => ({ ...d, rescanOnStartup: checked }));
                                        }}
                                    />

                                </div>

                            </div>

                        </section>

                    </div>

                </div>

            </section>
        </Layout>
    );

}
