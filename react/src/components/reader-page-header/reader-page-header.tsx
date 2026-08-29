import styles from '../../pages/reader.page.module.css';
import { ArrowLeftIcon } from '../../icons/arrow-left.icon';
import type { IBookmark } from '../../library.types';

export function ReaderPageHeader({
    currentPage,
    totalPages,
    bookmarks,
    goToPage,
    goBack
}: {
    currentPage: number;
    totalPages: number;
    bookmarks: IBookmark[];
    goToPage: (page: number) => void;
    goBack: () => void;
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
            <span className={styles.counter}>{currentPage} / {totalPages}</span>
        </header>
    );

}
