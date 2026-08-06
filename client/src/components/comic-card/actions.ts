import { UltraComponent } from "ultra-light-js";
import styles from './comic-card.module.css';
import { MarkAsReadButton } from "./mark-as-read-button";
import { DeleteFileButton } from "./delete-button";
import { MoveFileButton } from "./move-button";

export function ComicCardActions({
    uid,
    name
}: {
    uid: string;
    name: string;
}) {

    return UltraComponent({
        component: '<div></div>',
        className: [styles.actions],
        children: [
            MarkAsReadButton({ uid }),
            MoveFileButton({ uid, name }),
            DeleteFileButton({ uid })
        ]
    })

}
