import type { WikiComic } from 'better-wiki';
import styles from './comic-card.module.css';
import { InfoRow } from './info-row';

export function ComicCardInfo({
    comic
}: {
    comic: WikiComic | null;
}) {

    const releaseDate = comic?.releaseDate;
    const { releaseMonth, releaseDay, releaseYear } = releaseDate || {};
    const released = releaseMonth && releaseDay && releaseYear
        ? [releaseMonth, releaseDay].map(n => n.padStart(2, '0')).join('/') + `/${releaseYear}`
        : '';

    return (
        <div className={styles.info}>

            <InfoRow label="Comic" value={comic?.title || ''} />

            <InfoRow label="Volume" value={comic?.volume || ''} />

            <InfoRow label="Issue" value={comic?.issue || ''} />

            <InfoRow label="Year" value={comic?.releaseDate?.releaseYear || ''} />

            <InfoRow label="Writer" value={(comic?.credits?.writers || []).join(', ')} />

            <InfoRow label="Artist" value={(comic?.credits?.artists || []).join(', ')} />

            <InfoRow label="Released" value={released} />

        </div>
    );
}
