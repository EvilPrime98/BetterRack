import { useEffect, useMemo } from 'react';
import styles from './move-file-modal.module.css';
import { FolderIcon } from "@/icons/folder.icon";
import { useLibraryStore } from "@/stores/library.store";
import { useMoveFileModalContext } from "@/context/MoveFileModalContext";
import type { ILibraryGroup } from "@/library.types";

function buildFolderPath(uid: string, groups: ILibraryGroup[]): string {

    const group = groups.find(g => g.uid === uid);
    if (group) return group.name;

    const byUid = new Map<string, { uid: string; name: string; parentId?: string }>();
    const ownerGroup = new Map<string, ILibraryGroup>();

    groups.forEach(g => g.entries.forEach(entry => {
        byUid.set(entry.uid, entry);
        ownerGroup.set(entry.uid, g);
    }));

    const names: string[] = [];
    let current = byUid.get(uid);

    while (current) {
        names.unshift(current.name);
        if (!current.parentId) {
            const owner = ownerGroup.get(current.uid);
            if (owner) names.unshift(owner.name);
            break;
        }
        current = byUid.get(current.parentId);
    }

    return names.join(' / ');

}

export function MoveFileModal() {

    const { isVisible, closeMoveFileModal, selectMoveTarget } = useMoveFileModalContext();
    const groups = useLibraryStore((s) => s.groups);
    // getLibraryItems() builds a fresh array every call — selecting it directly (rather than
    // deriving it via useMemo off the stable `groups` reference) makes every render produce a
    // "changed" snapshot, which triggers an infinite update loop under useSyncExternalStore.
    const folders = useMemo(
        () => useLibraryStore.getState().getLibraryItems({ onlyDir: true }),
        
        [groups]
    );

    const cancel = () => closeMoveFileModal();

    useEffect(() => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cancel();
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
        
    }, []);

    return (
        <div className={styles.overlay} style={{ display: isVisible ? undefined : 'none' }}>

            <div className={styles.backdrop} onClick={cancel} />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Move comic"
                className={styles.modal}
            >

                <p className={styles.title}>Move to: </p>

                <ul className={styles.list}>

                    <li className={styles.item} onClick={() => selectMoveTarget(undefined)}>
                        <FolderIcon size={14} color="#34c3d1" />
                        <span>Library root</span>
                    </li>

                    {folders.length
                        ? folders.map(folder => (
                            <li
                                key={folder.uid}
                                className={styles.item}
                                onClick={() => selectMoveTarget(folder.uid)}
                            >
                                <FolderIcon size={14} color="#c7c7c7" />
                                <span>{buildFolderPath(folder.uid, groups)}</span>
                            </li>
                        ))
                        : <li className={styles.empty}>No folders yet.</li>}

                </ul>

            </div>

        </div>
    );

}
