import { useState, type MouseEvent } from 'react';
import styles from './retry-thumbnail-button.module.css';
import { RefreshIcon } from '@/icons/refresh-icon';
import { retryThumbnail } from '@/services/library.service';

export function RetryThumbnailButton({
    uid,
    onRetried
}: {
    uid: string;
    onRetried: () => void;
}) {

    const [isRetrying, setIsRetrying] = useState(false);

    const onClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (isRetrying) return;
        setIsRetrying(true);
        retryThumbnail(uid)
            .catch(() => {})
            .finally(() => {
                setIsRetrying(false);
                onRetried();
            });
    };

    return (
        <span
            className={styles.retryThumbnailButton}
            aria-label="Regenerate the cover thumbnail"
            title="Regenerate the cover thumbnail"
            aria-busy={isRetrying}
            onClick={onClick}
        >
            <RefreshIcon size={16} />
        </span>
    );

}
