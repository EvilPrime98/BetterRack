import styles from './sidebar.module.css';
import { useLibraryMetadataStore } from '@/stores/libraryMetadata.store';

export function ScanMetadataButton() {

    const mode = useLibraryMetadataStore((s) => s.mode);
    const isScanning = useLibraryMetadataStore((s) => s.isScanning);
    const scanProgress = useLibraryMetadataStore((s) => s.scanProgress);
    const scanAndLoad = useLibraryMetadataStore((s) => s.scanAndLoad);

    if (mode === 'folder') return null;

    const label = isScanning && scanProgress
        ? `Scanning… ${scanProgress.scanned}/${scanProgress.total}`
        : 'Scan Library';

    return (
        <button
            className={[styles.refreshButton, isScanning ? styles.spinning : ''].filter(Boolean).join(' ')}
            aria-label="Scan library metadata"
            disabled={isScanning}
            onClick={() => scanAndLoad()}
        >
            <span className={styles.refreshSpinner}></span>
            <span>{label}</span>
        </button>
    );

}
