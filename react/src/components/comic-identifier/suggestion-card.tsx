import type { WikiComic } from 'better-wiki';
import styles from './comic-identifier.module.css';
import { ImageGen } from '../image-generic/image-generic';
import { useComicIdentStore } from '@/stores/comicIdent.store';
import { updateComicIdentity } from '../../services/comic-data.service';

export function SuggestionCard({
    comic
}: {
    comic: WikiComic
}) {

    const meta = [comic.volume, comic.issue ? `#${comic.issue}` : null]
        .filter(Boolean)
        .join(' · ');

    const onClick = () => {
        const uid = useComicIdentStore.getState().itemUid;
        updateComicIdentity(uid, {
            prefId: comic.pageId,
            sourceWiki: comic.sourceWiki,
            identified: true,
            comic
        }).catch(console.error);
        useComicIdentStore.getState().setLastIdentified({ uid, comic });
        useComicIdentStore.getState().setIsVisible(false);
    }

    return (
        <article className={styles.suggestionCard} onClick={onClick}>

            <div className={styles.suggestionCover}>
                <ImageGen src={comic.cover} />
            </div>

            <div className={styles.suggestionInfo}>
                <p className={styles.suggestionTitle}>{comic.title}</p>
                <p className={styles.suggestionMeta}>{meta}</p>
            </div>

        </article>
    );

}
