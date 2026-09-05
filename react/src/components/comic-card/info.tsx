import type { WikiComic } from 'better-wiki';
import styles from './comic-card.module.css';
import { InfoRow } from './info-row';
//import { CrButton } from '../cr-button/cr-button';

export function ComicCardInfo({
    navigate,
    comic
}: {
    navigate: (val: string) => void;
    comic: WikiComic | null;
}) {

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
