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
import { useLibraryStore } from '@/stores/library.store';
import { useServerModalStore } from '@/stores/serverModal.store';
import { useConfirmModalStore } from '@/stores/confirmModal.store';

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
        identifyFromMeta: settings.identifyFromMeta,
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
            identifyFromMeta: settings.identifyFromMeta,
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

    async function onReidentifyAll() {
        const confirmed = await useConfirmModalStore.getState().confirmDialog({
            title: 'Re-identify all comics?',
            message: 'This will re-run identification for every comic in your library, overwriting any existing matches.',
            confirmLabel: 'Re-identify'
        });
        if (!confirmed) return;
        useLibraryStore.getState().reidentifyAll();
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

                <div className={styles.grid}>

                <section className={`${styles.section} ${styles.colLeft}`}>

                    <h2 className={styles.sectionTitle}>Server</h2>

                    <p className={styles.empty}>
                        {isServerModalVisible ? undefined : (getStoredServerUrl() || 'No server configured')}
                    </p>

                    <BRButton
                        text="Change server"
                        onClick={() => useServerModalStore.getState().openServerModal()}
                    />

                </section>
        
                <section className={`${styles.section} ${styles.colLeft}`}>

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

                <section className={`${styles.section} ${styles.colRight}`}>

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
                            onChange={(e) => setDraft((d) => ({ ...d, apiUrl: (e.target as HTMLInputElement).value }))}
                        />

                        <TextField
                            fieldKey="baseUrl"
                            label="Base URL"
                            placeholder="https://example.com"
                            onChange={(e) => setDraft((d) => ({ ...d, baseUrl: (e.target as HTMLInputElement).value }))}
                        />

                        <TextField
                            fieldKey="hostDomain"
                            label="Host domain"
                            placeholder="https://example.com"
                            onChange={(e) => setDraft((d) => ({ ...d, hostDomain: (e.target as HTMLInputElement).value }))}
                        />

                    </div>

                    <div className={styles.fieldGroup}>

                        <h2 className={`${styles.sectionTitle} ${styles.groupDivider}`}>Identification</h2>

                        <div className={styles.toggleRow}>

                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={draft.identifyFromMeta}
                                    onChange={(e) => {
                                        const checked = e.currentTarget.checked;
                                        setDraft((d) => ({ ...d, identifyFromMeta: checked }));
                                    }}
                                />
                                {' '}Identify from metadata
                            </label>

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
                                    Reads ComicInfo.xml when present, otherwise uses the wiki.
                                </span>
                            </span>
                        
                            <BRButton
                                style={{
                                    width: 'fit-content'
                                }}
                                variant="secondary"
                                text="Re-identify all"
                                onClick={onReidentifyAll}
                            />

                        </div>

                    </div>

                    <BRButton
                        className={styles.saveButton}
                        text="Save"
                        onClick={onSave}
                    />

                    <p className={styles.errorText}>{settingsError}</p>

                </section>

                </div>

            </section>
        </Layout>
    );

}
