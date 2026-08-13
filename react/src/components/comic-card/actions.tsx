import styles from './comic-card.module.css';
import { MarkAsReadButton } from './mark-as-read-button';
import { DeleteFileButton } from './delete-button';
import { MoveFileButton } from './move-button';

export function ComicCardActions({
    uid,
    name
}: {
    uid: string;
    name: string;
}) {

    return (
        <div className={styles.actions}>
            <MarkAsReadButton uid={uid} />
            <MoveFileButton uid={uid} name={name} />
            <DeleteFileButton uid={uid} />
        </div>
    );

}
