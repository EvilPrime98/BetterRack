import styles from './comic-card.module.css';
import { MarkAsReadButton } from './mark-as-read-button';
import { DeleteFileButton } from './delete-button';
import { MoveFileButton } from './move-button';
import { RetryThumbnailButton } from './retry-thumbnail-button';

export function ComicCardActions({
    uid,
    name,
    onThumbnailRetried
}: {
    uid: string;
    name: string;
    onThumbnailRetried: () => void;
}) {

    return (
        <div className={styles.actions}>
            <MarkAsReadButton uid={uid} />
            <MoveFileButton uid={uid} name={name} />
            <RetryThumbnailButton uid={uid} onRetried={onThumbnailRetried} />
            <DeleteFileButton uid={uid} />
        </div>
    );

}
