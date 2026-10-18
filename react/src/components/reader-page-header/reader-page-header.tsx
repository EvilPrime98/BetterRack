import styles from '../../pages/reader.page.module.css';
import { ArrowLeftIcon } from '../../icons/arrow-left.icon';
import { RefreshIcon } from '../../icons/refresh-icon';
import type { IBookmark } from '../../library.types';
import type { TReadingMode } from '../../stores/userPref.store';
import { isDesktopApp } from '../../services/server-config.service';
import { BRDropdown } from '../br-dropdown/br-dropdown';
import { WindowControls } from '../window-controls/window-controls';

export function ReaderPageHeader({
    title,
    currentPage,
    totalPages,
    bookmarks,
    isRefreshing,
    readingMode,
    onReadingModeChange,
    goToPage,
    goBack,
    onRefresh
}: {
    title: string;
    currentPage: number;
    totalPages: number;
    bookmarks: IBookmark[];
    isRefreshing: boolean;
    readingMode: TReadingMode;
    onReadingModeChange: (mode: TReadingMode) => void;
    goToPage: (page: number) => void;
    goBack: () => void;
    onRefresh: () => void;
}) {

    const showControls = !isDesktopApp();

    const onBookmarkSelect = (value: string) => {
        const page = Number(value);
        if (Number.isInteger(page) && page >= 1) goToPage(page);
    };

    return (
        <header className={styles.toolbar}>
            <div className={styles.toolbarStart}>
                <button type="button" className={styles.back} onClick={goBack}>
                    <ArrowLeftIcon size={16} />
                    <span>Library</span>
                </button>
                {showControls && bookmarks.length > 0 && (
                    <BRDropdown
                        className={styles.bookmarks}
                        aria-label="Jump to bookmark"
                        triggerLabel="Jump to bookmark…"
                        value={String(currentPage)}
                        options={bookmarks.map((bookmark) => ({
                            value: String(bookmark.page),
                            label: `${bookmark.label} · p.${bookmark.page}`
                        }))}
                        onChange={onBookmarkSelect}
                    />
                )}
            </div>
            <h1 className={styles.title} title={title}>{title}</h1>
            <div className={styles.toolbarEnd}>
                {showControls && (
                    <BRDropdown<TReadingMode>
                        className={styles.bookmarks}
                        aria-label="Reading mode"
                        value={readingMode}
                        options={[
                            { value: 'vertical', label: 'Vertical' },
                            { value: 'horizontal', label: 'Horizontal' }
                        ]}
                        onChange={onReadingModeChange}
                    />
                )}
                <span className={styles.counter}>{currentPage} / {totalPages}</span>
                {showControls && (
                    <button
                        type="button"
                        className={[styles.refresh, isRefreshing ? styles.spinning : ''].filter(Boolean).join(' ')}
                        aria-label="Refresh scan"
                        onClick={onRefresh}
                    >
                        <RefreshIcon size={16} />
                    </button>
                )}
            </div>
            <div className={styles.windowControls}>
                <WindowControls />
            </div>
        </header>
    );

}
