import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '@/layout';
import { useEffect, type ReactNode } from 'react';
import type { WikiAppearanceEntry } from 'better-wiki';
import styles from './details-page.module.css';
import { ImageGen } from '@/components/image-generic/image-generic';
import { ArrowLeftIcon } from '@/icons/arrow-left.icon';
import { COMIC_FILTERS } from '@/library.types';
import { useComicById, CREDIT_ROLES, APPEARING_GROUPS } from '@/hooks/useComicById';

export function DetailsPage() {

    const { pageId } = useParams<{ pageId?: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sourceWiki = searchParams.get('sourceWiki');
    const { comic, loading, error, fetchComic } = useComicById();
    const { releaseMonth, releaseDay, releaseYear } = comic?.releaseDate || {};

    const released = releaseMonth && releaseDay && releaseYear
    ? [releaseMonth, releaseDay].map(n => n.padStart(2, '0')).join('/') + `/${releaseYear}`
    : '';

    const creditRows = CREDIT_ROLES
    .map(({ key, label }) => ({ label, names: comic?.credits?.[key] ?? [] }))
    .filter(row => row.names.length > 0);

    const firstWriter = comic?.credits?.writers?.[0];

    const appearingGroups = APPEARING_GROUPS
    .map(({ key, label }) => ({ label, entries: comic?.appearing?.[key] ?? [] }))
    .filter(group => group.entries.length > 0);

    useEffect(() => {
        fetchComic(pageId, sourceWiki ?? undefined);
    }, [pageId, sourceWiki, fetchComic]);

    return (
        <Layout>
            <section className={styles.page}>

                <header className={styles.header}>

                    <button
                        type="button"
                        className={styles.backButton}
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                    >
                        <ArrowLeftIcon size={16} />
                    </button>

                    <div className={styles.summary}>
                        <span className={styles.eyebrow}>
                            {comic?.volume || 'Comic'}{comic?.issue ? ` #${comic.issue}` : ''}
                        </span>
                        <h1 className={styles.title}>{comic?.title || (loading ? 'Loading…' : 'Comic details')}</h1>
                    </div>

                </header>

                {loading ? (
                    <div className={styles.stateMessage}>Loading comic details…</div>
                ) : error ? (
                    <div className={styles.stateMessage}>{error}</div>
                ) : comic ? (
                    <div className={styles.content}>

                        <div className={styles.hero}>

                            <div className={styles.coverWrap}>
                                <ImageGen className={styles.cover} src={comic.cover} alt={comic.title} />
                                {comic.event ? <span className={styles.eventTag}>{comic.event}</span> : null}
                            </div>

                            <div className={styles.heroInfo}>

                                <div className={styles.metaGrid}>
                                    {comic.volume ? <MetaItem label="Volume" value={comic.volume} /> : null}
                                    {comic.issue ? <MetaItem label="Issue" value={`#${comic.issue}`} /> : null}
                                    {released ? <MetaItem label="Released" value={released} /> : null}
                                    {comic.rating ? <MetaItem label="Rating" value={comic.rating} /> : null}
                                </div>

                                {creditRows.length > 0 ? (
                                    <div className={styles.credits}>
                                        {creditRows.map(row => {
                                            const clickable = row.label === 'Writer' && Boolean(firstWriter);
                                            return (
                                                <div
                                                    key={row.label}
                                                    className={[styles.creditRow, clickable ? styles.creditRowClickable : ''].filter(Boolean).join(' ')}
                                                    role={clickable ? 'button' : undefined}
                                                    tabIndex={clickable ? 0 : undefined}
                                                    onClick={clickable
                                                        ? () => navigate(`/filters?${COMIC_FILTERS.writer}=${encodeURIComponent(firstWriter as string)}`)
                                                        : undefined}
                                                >
                                                    <span className={styles.creditLabel}>{row.label}</span>
                                                    <span className={styles.creditValue}>{row.names.join(', ')}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}

                                {comic.quotation?.quote ? (
                                    <blockquote className={styles.quotation}>
                                        <p>&ldquo;{comic.quotation.quote}&rdquo;</p>
                                        {comic.quotation.speaker ? <cite>{comic.quotation.speaker}</cite> : null}
                                    </blockquote>
                                ) : null}

                            </div>

                        </div>

                        {comic.synopsis ? (
                            <SectionBlock title="Synopsis">
                                <p className={styles.synopsis}>{comic.synopsis}</p>
                            </SectionBlock>
                        ) : null}

                        {comic.storyTitles?.length ? (
                            <SectionBlock title="Stories">
                                <ul className={styles.plainList}>
                                    {comic.storyTitles.map((storyTitle, i) => <li key={i}>{storyTitle}</li>)}
                                </ul>
                            </SectionBlock>
                        ) : null}

                        {appearingGroups.length > 0 ? (
                            <SectionBlock title="Appearing">
                                <div className={styles.appearingGroups}>
                                    {appearingGroups.map(group => (
                                        <div key={group.label} className={styles.appearingGroup}>
                                            <span className={styles.appearingGroupLabel}>{group.label}</span>
                                            <div className={styles.chipList}>
                                                {group.entries.map((entry: WikiAppearanceEntry, i) => (
                                                    <span key={i} className={styles.chip} title={entry.statusNote || undefined}>
                                                        {entry.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SectionBlock>
                        ) : null}

                        {comic.coverVariants?.length ? (
                            <SectionBlock title="Cover Variants">
                                <div className={styles.variantGrid}>
                                    {comic.coverVariants.map(variant => (
                                        <div key={variant.coverNumber} className={styles.variantCard}>
                                            {variant.imageUrl ? (
                                                <ImageGen
                                                    className={styles.variantImage}
                                                    src={variant.imageUrl}
                                                    alt={variant.imageLabel || `Cover ${variant.coverNumber}`}
                                                />
                                            ) : null}
                                            <span className={styles.variantLabel}>{variant.imageLabel || `Cover ${variant.coverNumber}`}</span>
                                            {variant.artists.length > 0 ? (
                                                <span className={styles.variantArtists}>{variant.artists.join(', ')}</span>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </SectionBlock>
                        ) : null}

                        {comic.notes?.length ? (
                            <SectionBlock title="Notes">
                                <ul className={styles.plainList}>
                                    {comic.notes.map((note, i) => <li key={i}>{note}</li>)}
                                </ul>
                            </SectionBlock>
                        ) : null}

                        {comic.trivia?.length ? (
                            <SectionBlock title="Trivia">
                                <ul className={styles.plainList}>
                                    {comic.trivia.map((fact, i) => <li key={i}>{fact}</li>)}
                                </ul>
                            </SectionBlock>
                        ) : null}

                    </div>
                ) : null}

            </section>
        </Layout>
    );

}

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{label}</span>
            <span className={styles.metaValue}>{value}</span>
        </div>
    );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            {children}
        </section>
    );
}
