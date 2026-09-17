import styles from '../../pages/reader.page.module.css';
import { ArrowLeftIcon } from '../../icons/arrow-left.icon';
import { ReaderLayoutIcon } from '../../icons/reader-layout.icon';
import type { IBookmark, TReaderLayoutMode } from '../../library.types';

const LAYOUT_LABELS: Record<TReaderLayoutMode, string> = {
    'single-vertical': 'Single page',
    'double-vertical': 'Double page',
    'horizontal': 'Horizontal'
};

export function ReaderPageHeader({
    currentPage,
    totalPages,
    bookmarks,
    layoutMode,
    goToPage,
    goBack,
    cycleLayoutMode
}: {
    currentPage: number;
    totalPages: number;
    bookmarks: IBookmark[];
    layoutMode: TReaderLayoutMode;
    goToPage: (page: number) => void;
    goBack: () => void;
    cycleLayoutMode: () => void;
}) {

    const onBookmarkSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const page = Number(e.target.value);
        if (Number.isInteger(page) && page >= 1) goToPage(page);
    };

    return (
        <header className={styles.toolbar}>
            <button type="button" className={styles.back} onClick={goBack}>
                <ArrowLeftIcon size={16} />
                <span>Library</span>
            </button>
            {bookmarks.length > 0 && (
                <select className={styles.bookmarks} value="" onChange={onBookmarkSelect}>
                    <option value="">Jump to bookmark…</option>
                    {bookmarks.map((bookmark, i) => (
                        <option key={i} value={bookmark.page}>
                            {bookmark.label} · p.{bookmark.page}
                        </option>
                    ))}
                </select>
            )}
            <button
                type="button"
                className={styles.layoutToggle}
                onClick={cycleLayoutMode}
                aria-label={`Page layout: ${LAYOUT_LABELS[layoutMode]}`}
                title={LAYOUT_LABELS[layoutMode]}
            >
                <ReaderLayoutIcon mode={layoutMode} size={16} />
            </button>
            <span className={styles.counter}>{currentPage} / {totalPages}</span>
        </header>
    );

}
