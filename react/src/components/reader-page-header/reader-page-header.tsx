import styles from '../../pages/reader.page.module.css';
import { ArrowLeftIcon } from '../../icons/arrow-left.icon';

export function ReaderPageHeader({
    currentPage,
    totalPages,
    goBack
}: {
    currentPage: number;
    totalPages: number;
    goBack: () => void;
}) {

    return (
        <header className={styles.toolbar}>
            <button type="button" className={styles.back} onClick={goBack}>
                <ArrowLeftIcon size={16} />
                <span>Library</span>
            </button>
            <span className={styles.counter}>{currentPage} / {totalPages}</span>
        </header>
    );

}
