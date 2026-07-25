import { UltraComponent } from "ultra-light-js";
import styles from './comic-card.module.css';
import type { WikiComic } from "better-wiki";
import { InfoRow } from "./info-row";

export function ComicCardInfo({
    comic,
    subsComic
}: {
    comic: () => WikiComic | null;
    subsComic: (fn: (value: WikiComic | null) => void) => () => void;
}) {

    return UltraComponent({

        component: '<div></div>',

        className: [styles.info],

        children: [

            InfoRow({
                subsComic,
                label: 'Comic', 
                onValueChange: ($span) => {
                    $span.textContent = comic()?.title || '';
                }
            }),

            InfoRow({
                subsComic,
                label: 'Volume',
                onValueChange: ($span) => {
                    $span.textContent = comic()?.volume || '';
                }
            }),

            InfoRow({
                subsComic,
                label: 'Issue',
                onValueChange: ($span) => {
                    $span.textContent = comic()?.issue || '';
                }
            }),

            InfoRow({
                subsComic,
                label: 'Year',
                onValueChange: ($span) => {
                    $span.textContent = comic()?.releaseDate?.releaseYear || '';
                }
            }),

            InfoRow({
                subsComic,
                label: 'Writer',
                onValueChange: ($span) => {
                    $span.textContent = (comic()?.credits?.writers || []).join(', ');
                }
            }),

            InfoRow({
                subsComic,
                label: 'Artist',
                onValueChange: ($span) => {
                    $span.textContent = (comic()?.credits?.artists || []).join(', ');
                }
            }),

            InfoRow({
                subsComic,
                label: 'Released',
                onValueChange: ($span) => {
                    const releaseDate = comic()?.releaseDate;
                    const { releaseMonth, releaseDay, releaseYear } = releaseDate || {};
                    $span.textContent = releaseMonth && releaseDay && releaseYear
                        ? [releaseMonth, releaseDay].map(n => n.padStart(2, '0')).join('/') + `/${releaseYear}`
                        : '';
                }
            })

        ]
    })
}
