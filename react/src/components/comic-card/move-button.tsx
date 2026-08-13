import type { MouseEvent } from 'react';
import styles from './move-button.module.css';
import { FolderIcon } from '@/icons/folder.icon';
import { useMoveFileModalContext } from '@/context/MoveFileModalContext';

export function MoveFileButton({
    uid,
    name
}: {
    uid: string;
    name: string;
}) {

    const { openMoveFileModal } = useMoveFileModalContext();

    const onClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        openMoveFileModal(uid, name);
    };

    return (
        <span
            className={styles.moveButton}
            aria-label="Move this comic to another folder"
            onClick={onClick}
        >
            <FolderIcon size={18} />
        </span>
    );

}
