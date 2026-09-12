import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './folder-card.module.css';
import { ChevronDownIcon } from "@/icons/chevron.icon";
import { TrashIcon } from "@/icons/trash.icon";
import { useComicsTypeStore } from "@/stores/comicsTypes.store";
import { useLibraryStore } from "@/stores/library.store";
import { FolderCardStack } from "./folder-card-stack";
import { useConfirmModalStore } from "@/stores/confirmModal.store";
import { FolderCardBasic } from "./folder-card-basic";
import { MoveFileButton } from "@/components/comic-card/move-button";

export function FolderCard({
    title,
    uid
}: {
    title: string,
    uid: string
}) {

    const STACK_SIZE = 3;
    const comicsType = useComicsTypeStore((s) => s.type);

    const groups = useLibraryStore((s) => s.groups);

    const stackCovers = useMemo(
        () => useLibraryStore.getState().getLibraryItems({ onlyDir: false, uid })
            .filter(item => !item.did)
            .slice(0, STACK_SIZE),
        
        [groups, uid]
    );

    const onDeleteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const confirmed = await useConfirmModalStore.getState().confirmDialog({
            title: 'Delete folder?',
            message: `This will remove "${title}" and everything inside it. This cannot be undone.`,
            confirmLabel: 'Delete'
        });
        if (!confirmed) return;
        useLibraryStore.getState().deleteFolder(uid);
    }

    return (
        <article
            className={[
                styles.folderCard,
                ...(comicsType === 'detail' ? [styles.detailMode] : [])
            ].join(' ')}
        >

            <Link to={`/${uid}`} className={styles.cardLink}>

                {   (stackCovers.length)
                    ? <FolderCardStack 
                        stackCovers={stackCovers} 
                    />
                    : <FolderCardBasic 
                        title={title} 
                    />
                }

                <div className={styles.body}>
                    <span className={styles.kind}>Folder</span>
                    <p className={styles.title}>{title}</p>
                </div>

                <span className={styles.chevron} aria-hidden="true">
                    <ChevronDownIcon size={14} color="currentColor" />
                </span>

            </Link>

            <div className={styles.folderActions}>
                <MoveFileButton uid={uid} name={title} />
                <span
                    className={[styles.folderActionButton, styles.folderDeleteButton].join(' ')}
                    aria-label="Delete this folder"
                    onClick={onDeleteClick}
                >
                    <TrashIcon size={14} />
                </span>
            </div>

        </article>
    );

}
