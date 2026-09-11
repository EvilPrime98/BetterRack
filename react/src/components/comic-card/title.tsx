import { Link } from 'react-router-dom';
import type { WikiComic } from 'better-wiki';
import styles from './comic-card.module.css';
import type { ILibraryResponseItem } from '@/library.types';
import { useComicsTypeStore } from '@/stores/comicsTypes.store';

export function ComicCardTitle({
    item,
    comic,
    readerHref
}: {
    item: ILibraryResponseItem;
    comic: WikiComic | null;
    readerHref: string;
}) {

    const type = useComicsTypeStore((s) => s.type);

    const titleText = (() => {
        if (!comic || !comic.title) return item.name;
        const series = comic.title.split('Vol')[0];
        const issue = comic.issue ? `#${comic.issue}` : '';
        const year = comic.releaseDate?.releaseYear || '';
        return type === 'cover'
            ? `${series} ${issue} (${year})`
            : item.name;
    })();

    return (
        <Link to={readerHref}>
            <p className={styles.title} title={item.name}>{titleText}</p>
        </Link>
    );

}
