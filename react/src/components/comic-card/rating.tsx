import type { MouseEvent } from 'react';
import styles from './comic-card.module.css';
import { StarComponent, getStarFraction } from '@/components/star-component/star-component';
import { useComicCacheStore } from '@/stores/comicCache.store';

export function ComicRating({
    uid
}: {
    uid: string;
}) {

    const rating = useComicCacheStore((s) => s.cache[uid]?.rating || 0);

    const changeRating = (newRating: number) => {
        useComicCacheStore.getState().setCacheById(uid, { rating: newRating });
    };

    const onMouseEnter = (e: MouseEvent) => {
        const $svg = e.currentTarget as SVGSVGElement;
        const $fillRect = $svg.querySelector('.fillRect');
        const fraction = getStarFraction(e);
        $fillRect?.setAttribute('width', String(16 * fraction));
    };

    const onMouseLeave = (e: MouseEvent) => {
        const $svg = e.currentTarget as SVGSVGElement;
        const $fillRect = $svg.querySelector('.fillRect');
        $fillRect?.setAttribute('width', '0');
    };

    const stars = [];
    let remaining = Math.max(0, Math.min(5, rating));
    for (let i = 0; i < 5; i++) {
        stars.push(
            <StarComponent
                key={i}
                weight={i + 1}
                changeRating={changeRating}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                initialFill={Math.max(0, Math.min(1, remaining))}
            />
        );
        remaining -= 1;
    }

    return (
        <div className={styles.rating}>
            {stars}
        </div>
    );

}
