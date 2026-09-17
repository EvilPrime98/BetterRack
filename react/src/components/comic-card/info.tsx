import type { WikiComic } from 'better-wiki';
import styles from './comic-card.module.css';
import type { TMetaSource } from '@/library.types';
import { InfoRow } from './info-row';
import { Loader } from '@/components/loader/loader';
//import { CrButton } from '../cr-button/cr-button';

const metaSourceLabel: Record<TMetaSource, string> = {
    wiki: 'From wiki',
    comicinfo: 'From ComicInfo.xml'
};

const metaSourceSrc: Record<TMetaSource, string> = {
    wiki: '/fandom.svg',
    comicinfo: '/xml.svg'
};

export function ComicCardInfo({
    navigate,
    comic,
    metaSource,
    isLoading
}: {
    navigate: (val: string) => void;
    comic: WikiComic | null;
    metaSource?: TMetaSource;
    isLoading?: boolean;
}) {

    if (isLoading) {
        return (
            <div className={styles.info}>
                <Loader visible size={16} className={styles.infoLoader} />
            </div>
        );
    }

    if (!comic) {
        return (
            <div className={styles.info}>
                <p className={styles.infoEmpty}>No information found.</p>
            </div>
        );
    }

    const releaseDate = comic?.releaseDate;

    const { releaseMonth, releaseDay, releaseYear } = releaseDate || {};

    const released = releaseMonth && releaseDay && releaseYear
    ? [releaseMonth, releaseDay].map(n => n.padStart(2, '0')).join('/') + `/${releaseYear}`
    : '';

    const writers = (comic?.credits?.writers || []);
    const firstWriter = writers[0];

    //const viewMoreURL = `/details/${comic?.pageId}?sourceWiki=${comic?.sourceWiki}`;

    return (
        <div className={styles.info}>

            {metaSource && (
                <div className={styles.metaSourceBadge} title={metaSourceLabel[metaSource]}>
                    <img src={metaSourceSrc[metaSource]} alt={metaSourceLabel[metaSource]} />
                </div>
            )}

            <InfoRow label="Comic" value={comic?.title || ''} />

            <InfoRow label="Volume" value={comic?.volume || ''} />

            <InfoRow label="Issue" value={comic?.issue || ''} />

            <InfoRow label="Year" value={comic?.releaseDate?.releaseYear || ''} />

            <InfoRow
                label="Writer"
                value={writers.join(', ')}
                onClick={firstWriter ? () => navigate(`/filters?writer=${encodeURIComponent(firstWriter)}`) : undefined}
            />

            <InfoRow
                label="Artist"
                value={(comic?.credits?.artists || []).join(', ')}
            />

            <InfoRow label="Released" value={released} />

            {/* <CrButton
                text="View More"
                className={styles.viewMore}
                onClick={() => navigate(viewMoreURL)}
            /> */}

        </div>
    );

}
