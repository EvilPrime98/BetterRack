import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './folder-card.module.css';
import { ChevronDownIcon } from "@/icons/chevron.icon";
import { GearIcon } from "@/icons/gear.icon";
import { TrashIcon } from "@/icons/trash.icon";
import { useComicsTypeStore } from "@/stores/comicsTypes.store";
import { useLibraryStore } from "@/stores/library.store";
import { FolderCardStack } from "./folder-card-stack";
import { useConfirmModalStore } from "@/stores/confirmModal.store";
import { useFolderPrefsModalContext } from "@/context/FolderPrefsModalContext";
import { FolderCardBasic } from "./folder-card-basic";

export function FolderCard({
    title,
    uid
}: {
    title: string,
    uid: string
}) {

    const STACK_SIZE = 3;

    const comicsType = useComicsTypeStore((s) => s.type);
    const { openFolderPrefsModal } = useFolderPrefsModalContext();

    const groups = useLibraryStore((s) => s.groups);
    // getLibraryItems() builds a fresh array every call — selecting it directly (rather than
    // deriving it via useMemo off the stable `groups` reference) makes every render produce a
    // "changed" snapshot, which triggers an infinite update loop under useSyncExternalStore.
    // getLibraryItems() reads `groups` internally via getState(); the `groups` dep below is
    // real, just indirect, so the linter can't see it — kept intentionally.
    const stackCovers = useMemo(
        () => useLibraryStore.getState().getLibraryItems({ onlyDir: false, uid })
            .filter(item => !item.did)
            .slice(0, STACK_SIZE),
        
        [groups, uid]
    );

    const onPrefsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        openFolderPrefsModal(uid, title);
    }

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

                {(stackCovers.length)
                    ? <FolderCardStack stackCovers={stackCovers} />
                    : <FolderCardBasic title={title} />}

                <div className={styles.body}>
                    <span className={styles.kind}>Folder</span>
                    <p className={styles.title}>{title}</p>
                </div>

                <span className={styles.chevron} aria-hidden="true">
                    <ChevronDownIcon size={14} color="currentColor" />
                </span>

            </Link>

            <div className={styles.folderActions}>
                {/* Source set attributes.type = 'button' on this <span>; that's a no-op on a non-form
                    element (spans have no `type` attribute) so it's dropped here — no behavior change. */}
                <span
                    className={styles.folderActionButton}
                    aria-label="Folder preferences"
                    onClick={onPrefsClick}
                >
                    <GearIcon size={14} />
                </span>
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
