import { UltraActivity, ultraState } from "ultra-light-js"
import styles from './comic-card.module.css'
import { StarComponent } from "../star-component";
import { COMIC_CACHE_CONTEXT } from "../../context/comic-cache.context";
import { ultraComicQueryClient } from "../../hooks/ultraComic";

export function ComicRating({
    uid
}: {
    uid: string
}) {

    const [rating, setRating, subsRating] = ultraState(
        COMIC_CACHE_CONTEXT.getCacheById(uid)?.rating || 0
    );

    const changeRating = (newRating: number) => {
        setRating(newRating);
        COMIC_CACHE_CONTEXT.setCacheById(uid, { rating: rating() })
    }

    const onMouseEnter = (e: Event) => {
        const $svg = e.currentTarget as SVGAElement;
        const $fillRect = $svg.querySelector('.fillRect');
        $fillRect?.setAttribute('width', '16')
    }

    const onMouseLeave = (e: Event) => {
        const $svg = e.currentTarget as SVGAElement;
        const $fillRect = $svg.querySelector('.fillRect');
        $fillRect?.setAttribute('width', '0')
    }

    const onRatingChange = ($div: HTMLElement) => {
        const stars = [];
        let remaining = Math.max(0, Math.min(5, rating()));
        for (let i = 0; i < 5; i++) {
            stars.push(
                StarComponent({
                    weight: i + 1,
                    changeRating,
                    onMouseEnter,
                    onMouseLeave,
                    initialFill: Math.max(0, Math.min(1, remaining))
                })
            );
            remaining -= 1;
        }
        $div.replaceChildren(...stars);
    }

    return UltraActivity({
        mode: {
            state:  () => !ultraComicQueryClient.isFetching(),
            subscriber: ultraComicQueryClient.subscribeToFetching
        },
        component: '<div></div>',
        className: [styles.rating],
        onMount: [onRatingChange],
        trigger: [{
            subscriber: subsRating,
            triggerFunction: onRatingChange
        }]
    });

}

