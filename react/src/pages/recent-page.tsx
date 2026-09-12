import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComicCard } from '@/components/comic-card/comic-card';
import { Layout } from '@/layout';
import { useComicsTypeStore } from '@/stores/comicsTypes.store';
import { useRecentlyAdded } from '@/hooks/useRecentlyAdded';
import { useBackgroundImage } from '@/hooks/useBackgroundImage';
import { ArrowLeftIcon } from '@/icons/arrow-left.icon';
import { ChevronDownIcon } from '@/icons/chevron.icon';
import { RECENT_WINDOW_OPTIONS, type TRecentWindow } from '@/library.types';
import styles from './recent-page.module.css';

function WindowFilter({
    selected,
    onSelect
}: {
    selected: TRecentWindow;
    onSelect: (option: TRecentWindow) => void;
}) {

    const [isOpen, setOpen] = useState(false);

    // A click on the document closes the menu. The control stops propagation on
    // its own clicks. This stops the menu from closing again right after it opens.
    useEffect(() => {
        const close = () => setOpen(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, []);

    return (
        <div
            className={[styles.filter, isOpen ? styles.filterOpen : ''].filter(Boolean).join(' ')}
            onClick={(e) => { e.stopPropagation(); setOpen(!isOpen); }}
        >

            <span className={styles.filterLabel}>{selected.label}</span>

            <ChevronDownIcon size={14} />

            <ul className={styles.filterMenu} style={{ display: isOpen ? undefined : 'none' }}>
                {RECENT_WINDOW_OPTIONS.map(option => (
                    <li
                        key={option.hours}
                        className={styles.filterOption}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(option);
                            setOpen(false);
                        }}
                    >
                        {option.label}
                    </li>
                ))}
            </ul>

        </div>
    );

}

export function RecentPage() {

    const navigate = useNavigate();
    const [selectedWindow, setSelectedWindow] = useState<TRecentWindow>(RECENT_WINDOW_OPTIONS[0]);
    const { items, isLoading, error } = useRecentlyAdded(selectedWindow.hours);
    const comicsType = useComicsTypeStore((s) => s.type);
    const backgroundUrl = useBackgroundImage(items, `recent:${selectedWindow.hours}`);

    return (
        <Layout>
            <section
                className={[styles.page, backgroundUrl ? 'view-background' : ''].filter(Boolean).join(' ')}
                style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined}
            >

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
                        <span className={styles.eyebrow}>Recently added</span>
                        <h1 className={styles.title}>{selectedWindow.label}</h1>
                    </div>

                    <WindowFilter selected={selectedWindow} onSelect={setSelectedWindow} />

                </header>

                {isLoading ? (
                    <p className={styles.empty}>Loading recently added comics…</p>
                ) : error ? (
                    <p className={styles.empty}>{error}</p>
                ) : items.length === 0 ? (
                    <p className={styles.empty}>Nothing added in the {selectedWindow.label.toLowerCase()}.</p>
                ) : (
                    // The endpoint returns this list newest-first. Render it in the order received.
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
