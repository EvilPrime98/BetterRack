import { UltraComponent } from "ultra-light-js";
import styles from './retry-thumbnail-button.module.css';
import { RefreshIcon } from "@/icons/refresh-icon";
import { retryThumbnail } from "@/services/library.service";

export function RetryThumbnailButton({
    uid,
    onRetried
}: {
    uid: string;
    onRetried: () => void;
}) {

    const onClick = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        const $button = e.currentTarget as HTMLElement;
        if ($button.getAttribute('aria-busy') === 'true') return;
        $button.setAttribute('aria-busy', 'true');
        retryThumbnail(uid)
            .catch(() => {})
            .finally(() => {
                $button.setAttribute('aria-busy', 'false');
                onRetried();
            });
    }

    return UltraComponent({
        component: '<span></span>',
        className: [styles.retryThumbnailButton],
        attributes: {
            type: 'button',
            'aria-label': 'Regenerate the cover thumbnail',
            'aria-busy': 'false'
        },
        eventHandler: {
            click: onClick
        },
        children: [
            RefreshIcon({ size: 16 })
        ]
    })

}
