import styles from '../../pages/reader.page.module.css';
import { ArrowLeftIcon } from '../../icons/arrow-left.icon';
import { RefreshIcon } from '../../icons/refresh-icon';
import type { IBookmark } from '../../library.types';
import { WindowControls } from '../window-controls/window-controls';

export function ReaderPageHeader({
    title,
    currentPage,
    totalPages,
    bookmarks,
    isRefreshing,
    goToPage,
    goBack,
    onRefresh
}: {
    title: string;
    currentPage: number;
    totalPages: number;
    bookmarks: IBookmark[];
    isRefreshing: boolean;
    goToPage: (page: number) => void;
    goBack: () => void;
    onRefresh: () => void;
}) {

    const onBookmarkSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const page = Number(e.target.value);
        if (Number.isInteger(page) && page >= 1) goToPage(page);
    };

    return (
        <header className={styles.toolbar}>
            <div className={styles.toolbarStart}>
                <button type="button" className={styles.back} onClick={goBack}>
                    <ArrowLeftIcon size={16} />
                    <span>Library</span>
                </button>
                {bookmarks.length > 0 && (
                    <select className={styles.bookmarks} aria-label="Jump to bookmark" value="" onChange={onBookmarkSelect}>
                        <option value="">Jump to bookmark…</option>
                        {bookmarks.map((bookmark) => (
                            <option key={bookmark.page} value={bookmark.page}>
                                {bookmark.label} · p.{bookmark.page}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            <h1 className={styles.title} title={title}>{title}</h1>
            <div className={styles.toolbarEnd}>
                <span className={styles.counter}>{currentPage} / {totalPages}</span>
                <button
                    type="button"
                    className={[styles.refresh, isRefreshing ? styles.spinning : ''].filter(Boolean).join(' ')}
                    aria-label="Refresh scan"
                    onClick={onRefresh}
                >
                    <RefreshIcon size={16} />
                </button>
            </div>
            <div className={styles.windowControls}>
                <WindowControls />
            </div>
        </header>
    );

}
