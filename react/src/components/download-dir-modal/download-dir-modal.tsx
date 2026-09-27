import { useEffect, useState } from 'react';
import styles from './download-dir-modal.module.css';
import { FolderIcon } from '@/icons/folder.icon';
import { useSettingsStore } from '@/stores/settings.store';
import { useDownloadDirModalContext } from '@/context/DownloadDirModalContext.hooks';
import { areDirectoryListsEqual, getCachedDirectories, refreshDirectories } from '@/services/fs.service';

type TListState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; dirs: string[] };

export function DownloadDirModal() {

    const { isVisible, closeDownloadDirModal, confirmDownloadDir } = useDownloadDirModalContext();
    const currentDefault = useSettingsStore((s) => s.settings.downloadDir);

    const [listState, setListState] = useState<TListState>({ status: 'loading' });

    const cancel = () => closeDownloadDirModal();

    useEffect(() => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cancel();
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        const cachedDirs = getCachedDirectories();
        setListState(cachedDirs ? { status: 'ready', dirs: cachedDirs } : { status: 'loading' });
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
    }, [isVisible]);

    return (
        <div className={styles.overlay} style={{ display: isVisible ? undefined : 'none' }}>

            <button type="button" className={styles.backdrop} aria-label="Close dialog" onClick={cancel} />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Choose download directory"
                className={styles.modal}
            >

                <p className={styles.title}>Download to: </p>

                <ul className={styles.list}>

                    {listState.status === 'loading' && <li className={styles.empty}>Loading…</li>}

                    {listState.status === 'error' && <li className={styles.empty}>{listState.message}</li>}

                    {listState.status === 'ready' && listState.dirs.length === 0 && (
                        <li className={styles.empty}>No directories available. Set a download or library folder in Settings.</li>
                    )}

                    {listState.status === 'ready' && listState.dirs.map((dir) => {
                        const isDefault = dir === currentDefault;
                        return (
                            <li key={dir}>
                                <button
                                    type="button"
                                    className={[styles.item, isDefault ? styles.default : ''].filter(Boolean).join(' ')}
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
