import { useEffect, useMemo, useState } from 'react';
import styles from './download-dir-modal.module.css';
import { FolderIcon } from '@/icons/folder.icon';
import { Checkbox } from '@/components/checkbox/checkbox';
import { useSettingsStore } from '@/stores/settings.store';
import { useDownloadDirModalContext } from '@/context/DownloadDirModalContext.hooks';
import { areDirectoryListsEqual, getCachedDirectories, refreshDirectories } from '@/services/fs.service';

type TListState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; dirs: string[] };

function normalizePath(dir: string): string {
    return dir.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function getTopLevelDirs(dirs: string[]): string[] {
    const normalized = dirs.map(normalizePath);
    return dirs.filter((_, i) => !normalized.some((other, j) => j !== i && normalized[i].startsWith(`${other}/`)));
}

export function DownloadDirModal() {

    const { isVisible } = useDownloadDirModalContext();

    return isVisible ? <DownloadDirModalContent /> : null;

}

function DownloadDirModalContent() {

    const { closeDownloadDirModal, confirmDownloadDir } = useDownloadDirModalContext();
    const currentDefault = useSettingsStore((s) => s.settings.downloadDir);

    const [listState, setListState] = useState<TListState>(() => {
        const cachedDirs = getCachedDirectories();
        return cachedDirs ? { status: 'ready', dirs: cachedDirs } : { status: 'loading' };
    });
    const [query, setQuery] = useState('');
    const [showSubfolders, setShowSubfolders] = useState(true);

    const cancel = () => closeDownloadDirModal();

    useEffect(() => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDownloadDirModal();
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, [closeDownloadDirModal]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const dirs = await refreshDirectories();
                if (cancelled) return;
                setListState((prev) => (
                    prev.status === 'ready' && areDirectoryListsEqual(prev.dirs, dirs)
                        ? prev
                        : { status: 'ready', dirs }
                ));
            } catch (e) {
                if (cancelled) return;
                setListState((prev) => (
                    prev.status === 'ready'
                        ? prev
                        : { status: 'error', message: e instanceof Error ? e.message : 'Failed to load directories.' }
                ));
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const allDirs = listState.status === 'ready' ? listState.dirs : null;

    const visibleDirs = useMemo(() => {
        if (!allDirs) return [];
        const candidates = showSubfolders ? allDirs : getTopLevelDirs(allDirs);
        const normalizedQuery = query.trim().toLowerCase();
        return normalizedQuery
            ? candidates.filter((dir) => dir.toLowerCase().includes(normalizedQuery))
            : candidates;
    }, [allDirs, showSubfolders, query]);

    return (
        <div className={styles.overlay}>

            <button type="button" className={styles.backdrop} aria-label="Close dialog" onClick={cancel} />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Choose download directory"
                className={styles.modal}
            >

                <p className={styles.title}>Download to: </p>

                <div className={styles.searchRow}>

                    <input
                        type="text"
                        autoFocus
                        className={styles.search}
                        placeholder="Search folders..."
                        aria-label="Search folders"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />

                    <Checkbox
                        className={styles.checkbox}
                        label="Sub-folders"
                        checked={showSubfolders}
                        onChange={(e) => setShowSubfolders(e.target.checked)}
                    />

                </div>

                <ul className={styles.list}>

                    {listState.status === 'loading' && <li className={styles.empty}>Loading…</li>}

                    {listState.status === 'error' && <li className={styles.empty}>{listState.message}</li>}

                    {allDirs && allDirs.length === 0 && (
                        <li className={styles.empty}>No directories available. Set a download or library folder in Settings.</li>
                    )}

                    {allDirs && allDirs.length > 0 && visibleDirs.length === 0 && (
                        <li className={styles.empty}>No folders match your search.</li>
                    )}

                    {visibleDirs.map((dir) => {
                        const isDefault = dir === currentDefault;
                        return (
                            <li key={dir}>
                                <button
                                    type="button"
                                    className={[styles.item, isDefault ? styles.default : ''].filter(Boolean).join(' ')}
                                    title={dir}
                                    onClick={() => confirmDownloadDir(dir)}
                                >
                                    <FolderIcon size={14} color={isDefault ? '#34c3d1' : '#c7c7c7'} />
                                    <span>{dir}</span>
                                    {isDefault && <span className={styles.badge}>default</span>}
                                </button>
                            </li>
                        );
                    })}

                </ul>

            </div>

        </div>
    );

}
