import { useState, type MouseEvent } from 'react';
import styles from './sidebar.module.css';
import { useLibraryStore } from '@/stores/library.store';
import { useNewFolderModalContext } from '@/context/NewFolderModalContext.hooks';
import { SideBarElement } from './sider-bar-element';
import { FolderIcon } from '@/icons/folder.icon';
import { FolderPlusIcon } from '@/icons/folder-plus.icon';
import { ChevronDownIcon } from '@/icons/chevron.icon';
import type { ILibraryGroup } from '@/library.types';

export function SideBarGroup({
    group
}: {
    group: ILibraryGroup
}) {

    const [isExpanded, setIsExpanded] = useState(false);
    const getLibraryItems = useLibraryStore((s) => s.getLibraryItems);
    const { openNewFolderModal } = useNewFolderModalContext();

    function toggle() {
        setIsExpanded(!isExpanded);
    }

    function onNewFolder(e: MouseEvent) {
        e.stopPropagation();
        openNewFolderModal(group.uid);
    }

    const entries = isExpanded
    ? getLibraryItems({ onlyDir: true, uid: group.uid })
    : [];

    return (
        <div className={styles.group}>

            <div className={styles.groupHeader}>
                <button
                    type="button"
                    className={styles.groupHeaderToggle}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${group.name}`}
                    onClick={toggle}
                >
                    <FolderIcon size={16} />
                    <span>{group.name}</span>
                    <div className={[styles.chevron, isExpanded ? styles.chevronExpanded : ''].filter(Boolean).join(' ')}>
                        <ChevronDownIcon size={14} />
                    </div>
                </button>
                <button
                    type="button"
                    className={styles.groupHeaderAction}
                    aria-label={`New folder in ${group.name}`}
                    onClick={onNewFolder}
                >
                    <FolderPlusIcon size={14} />
                </button>
            </div>

            <nav className={styles.groupList}>
                {entries.map(item => (
                    <SideBarElement key={item.uid} item={item} />
                ))}
            </nav>

        </div>
    );

}
