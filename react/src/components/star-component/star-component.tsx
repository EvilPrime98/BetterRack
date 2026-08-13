import type { MouseEvent } from 'react';
import { StarIcon } from '@/icons/star.icon';

export function getStarFraction(e: MouseEvent): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
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
    onMouseEnter: (e: MouseEvent) => void,
    onMouseLeave: (e: MouseEvent) => void
}) {

    const locked = initialFill > 0;

    return (
        <StarIcon
            size={18}
            fill={initialFill}
            onMouseMove={(e) => !locked && onMouseEnter(e)}
            onMouseLeave={(e) => !locked && onMouseLeave(e)}
            onClick={(e) => changeRating(weight - 1 + getStarFraction(e))}
        />
    );

}
