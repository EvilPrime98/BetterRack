import { UltraComponent } from "ultra-light-js";
import { StarIcon } from "../icons/star.icon";

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
            mouseenter: (e) => !locked && onMouseEnter(e),
            mouseleave: (e) => !locked && onMouseLeave(e),
            click: () => changeRating(weight)
        }
    })

}