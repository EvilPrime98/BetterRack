import { UltraComponent } from "ultra-light-js";
import styles from './comic-card.module.css';
import { MarkAsReadButton } from "./mark-as-read-button";
import { DeleteFileButton } from "./delete-button";
import { MoveFileButton } from "./move-button";
import { RetryThumbnailButton } from "./retry-thumbnail-button";

export function ComicCardActions({
    uid,
    name,
    onThumbnailRetried
}: {
    uid: string;
    name: string;
    onThumbnailRetried: () => void;
}) {

    return UltraComponent({
        component: '<div></div>',
        className: [styles.actions],
        children: [
            MarkAsReadButton({ uid }),
            MoveFileButton({ uid, name }),
            RetryThumbnailButton({ uid, onRetried: onThumbnailRetried }),
            DeleteFileButton({ uid })
        ]
    })

}
