import styles from './comic-card.module.css';
import { MarkAsReadButton } from './mark-as-read-button';
import { DeleteFileButton } from './delete-button';
import { MoveFileButton } from './move-button';
import { RefreshComicButton } from './refresh-comic-button';

export function ComicCardActions({
    uid,
    name,
    onComicRefreshed
}: {
    uid: string;
    name: string;
    onComicRefreshed: () => void;
}) {

    return (
        <div className={styles.actions}>
            <MarkAsReadButton uid={uid} />
            <MoveFileButton uid={uid} name={name} />
            <RefreshComicButton uid={uid} onRefreshed={onComicRefreshed} />
            <DeleteFileButton uid={uid} />
        </div>
    );

}
