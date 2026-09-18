import { useNavigate } from 'react-router-dom';
import { ComicCard } from '@/components/comic-card/comic-card';
import { Layout } from '@/layout';
import { useComicsTypeStore } from '@/stores/comicsTypes.store';
import { useReading } from '@/hooks/useReading';
import { ArrowLeftIcon } from '@/icons/arrow-left.icon';
import styles from './reading-page.module.css';

export function ReadingPage() {

    const navigate = useNavigate();
    const { items, isLoading, error } = useReading();
    const comicsType = useComicsTypeStore((s) => s.type);

    return (
        <Layout>
            <section className={styles.page}>

                <header className={styles.header}>

                    <button
                        type="button"
                        className={styles.backButton}
                        onClick={() => navigate('/')}
                        aria-label="Back to library"
                    >
                        <ArrowLeftIcon size={16} />
                    </button>

                    <div className={styles.summary}>
                        <span className={styles.eyebrow}>Keep reading</span>
                        <h1 className={styles.title}>Currently reading</h1>
                    </div>

                </header>

                {isLoading ? (
                    <p className={styles.empty}>Loading comics in progress…</p>
                ) : error ? (
                    <p className={styles.empty}>{error}</p>
                ) : items.length === 0 ? (
                    <p className={styles.empty}>Nothing in progress.</p>
                ) : (
                    <section className={[styles.comicContainer, comicsType === 'detail' ? styles.detailLayout : ''].filter(Boolean).join(' ')}>
                        {items.map(item =>
                            <ComicCard
                                item={item}
                                key={item.uid}
                            />
                        )}
                    </section>
                )}

            </section>
        </Layout>
    );

}
