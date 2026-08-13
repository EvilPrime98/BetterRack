import { useState } from 'react';
import { useLibraryStore } from '@/stores/library.store';
import styles from './sidebar.module.css';

export function RefreshLibraryButton() {

    // useLibraryStore doesn't expose a shared fetching flag, so "spinning" reflects only
    // this button's own refreshLibrary() call, not any in-flight fetch from elsewhere.
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshLibrary = useLibraryStore((s) => s.refreshLibrary);

    async function handleRefresh() {
        setIsRefreshing(true);
        try {
            await refreshLibrary();
        } finally {
            setIsRefreshing(false);
        }
    }

    return (
        <button
            className={[styles.refreshButton, isRefreshing ? styles.spinning : ''].filter(Boolean).join(' ')}
            aria-label="Refresh library"
            onClick={handleRefresh}
        >
            <span className={styles.refreshSpinner}></span>
            <span>Refresh Libraries</span>
        </button>
    );

}
