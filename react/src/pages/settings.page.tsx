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
import { getStoredServerUrl, hasNativeFolderPicker } from '@/services/server-config.service';
import { useServerModalStore } from '@/stores/serverModal.store';

export function SettingsPage() {

    const settings = useSettingsStore((s) => s.settings);
    const setTitle = useDocumentTitleStore((s) => s.setTitle);
    const isServerModalVisible = useServerModalStore((s) => s.isVisible);

    const [folderError, setFolderError] = useState('');
    const [settingsError, setSettingsError] = useState('');
    const [folderPath, setFolderPath] = useState('');
    const [draft, setDraft] = useState({
        apiUrl: settings.apiUrl,
        baseUrl: settings.baseUrl,
        hostDomain: settings.hostDomain,
        downloadDir: settings.downloadDir,
    });

    useEffect(() => {
        setTitle('Settings');
    }, [setTitle]);

    useEffect(() => {
        setDraft({
            apiUrl: settings.apiUrl,
            baseUrl: settings.baseUrl,
            hostDomain: settings.hostDomain,
            downloadDir: settings.downloadDir,
        });
    }, [settings]);

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

    return (
        <Layout>
            <section className={styles.page}>

                <h1 className={styles.title}>Settings</h1>

                <section className={styles.section}>

                    <h2 className={styles.sectionTitle}>Server</h2>

                    <p className={styles.empty}>
                        {isServerModalVisible ? undefined : (getStoredServerUrl() || 'No server configured')}
                    </p>

                    <BRButton
                        text="Change server"
                        onClick={() => useServerModalStore.getState().openServerModal()}
                    />

                </section>

                <section className={styles.section}>

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
                            className={styles.addBtn}
                            onClick={onAddFolder}
                        />

                    </div>

                    <p className={styles.errorText}>{folderError}</p>

                </section>

                <section className={styles.section}>

                    <div className={styles.fieldGroup}>

                        <h2 className={styles.sectionTitle}>Downloads</h2>

                        <TextField
                            fieldKey="downloadDir"
                            label="Download folder"
                            placeholder="/path/to/downloads"
                            onChange={(e) => setDraft((d) => ({ ...d, downloadDir: e.target.value }))}
                        />

                    </div>

                    <div className={styles.fieldGroup}>

                        <h2 className={`${styles.sectionTitle} ${styles.groupDivider}`}>Store configuration</h2>

                        <TextField
                            fieldKey="apiUrl"
                            label="API URL"
                            placeholder="https://example.com/wp-json/wp/v2"
                            onKeyDown={(e) => setDraft((d) => ({ ...d, apiUrl: (e.target as HTMLInputElement).value }))}
                        />

                        <TextField
                            fieldKey="baseUrl"
                            label="Base URL"
                            placeholder="https://example.com"
                            onKeyDown={(e) => setDraft((d) => ({ ...d, baseUrl: (e.target as HTMLInputElement).value }))}
                        />

                        <TextField
                            fieldKey="hostDomain"
                            label="Host domain"
                            placeholder="https://example.com"
                            onKeyDown={(e) => setDraft((d) => ({ ...d, hostDomain: (e.target as HTMLInputElement).value }))}
                        />

                    </div>

                    <BRButton text="Save" onClick={onSave} />

                    <p className={styles.errorText}>{settingsError}</p>

                </section>

            </section>
        </Layout>
    );

}
