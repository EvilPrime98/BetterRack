import { UltraComponent } from "ultra-light-js";
import { StarIcon } from "../../icons/star.icon";

export function getStarFraction(e: Event): number {
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    const x = (e as MouseEvent).clientX - rect.left;
    return x < rect.width / 2 ? 0.5 : 1;
}

export function StarComponent({
    weight,
    initialFill,
    changeRating,
    onMouseEnter,
    onMouseLeave
}: {
    weight: number,
    initialFill: number,
    changeRating: (newRating: number) => void
    onMouseEnter: (e: Event) => void,
    onMouseLeave: (e: Event) => void
}) {

    const locked = initialFill > 0;

    return UltraComponent({
        component: StarIcon({
            size: 18,
            fill: initialFill
        }),
        eventHandler: {
            mousemove: (e) => !locked && onMouseEnter(e),
            mouseleave: (e) => !locked && onMouseLeave(e),
            click: (e) => changeRating(weight - 1 + getStarFraction(e))
        }
    })

}