import styles from './sidebar.module.css';
import { useLibraryMetadataStore } from '@/stores/libraryMetadata.store';
import { LIBRARY_METADATA_FIELDS, LIBRARY_METADATA_FIELD_LABELS, type TLibraryGroupMode } from '@/library.types';

const OPTIONS: { mode: TLibraryGroupMode; label: string }[] = [
    { mode: 'folder', label: 'Folder' },
    { mode: LIBRARY_METADATA_FIELDS.series, label: LIBRARY_METADATA_FIELD_LABELS.series },
    { mode: LIBRARY_METADATA_FIELDS.writer, label: LIBRARY_METADATA_FIELD_LABELS.writer },
    { mode: LIBRARY_METADATA_FIELDS.year, label: LIBRARY_METADATA_FIELD_LABELS.year },
];

export function GroupModeSelect() {

    const mode = useLibraryMetadataStore((s) => s.mode);
    const setMode = useLibraryMetadataStore((s) => s.setMode);

    return (
        <div className={styles.modeSelect}>
            {OPTIONS.map(({ mode: optionMode, label }) => (
                <button
                    key={optionMode}
                    type="button"
                    className={[styles.modeOption, mode === optionMode ? styles.modeOptionActive : ''].filter(Boolean).join(' ')}
                    onClick={() => setMode(optionMode)}
                >
                    <span>{label}</span>
                </button>
            ))}
        </div>
    );

}
