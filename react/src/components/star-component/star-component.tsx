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
    onHover
}: {
    weight: number,
    initialFill: number,
    changeRating: (newRating: number) => void
    onHover: (previewRating: number) => void
}) {

    return (
        <StarIcon
            size={18}
            fill={initialFill}
            onMouseMove={(e) => onHover(weight - 1 + getStarFraction(e))}
            onClick={(e) => changeRating(weight - 1 + getStarFraction(e))}
        />
    );

}
