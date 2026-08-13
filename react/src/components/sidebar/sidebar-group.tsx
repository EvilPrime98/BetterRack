import { useState } from 'react';
import styles from './sidebar.module.css';
import { useLibraryStore } from '@/stores/library.store';
import { SideBarElement } from './sider-bar-element';
import { FolderIcon } from '@/icons/folder.icon';
import { ChevronDownIcon } from '@/icons/chevron.icon';
import type { ILibraryGroup } from '@/library.types';

export function SideBarGroup({
    group
}: {
    group: ILibraryGroup
}) {

    const [isExpanded, setIsExpanded] = useState(false);
    const getLibraryItems = useLibraryStore((s) => s.getLibraryItems);

    function toggle() {
        setIsExpanded(!isExpanded);
    }

    const entries = isExpanded
        ? getLibraryItems({ onlyDir: true, uid: group.uid })
        : [];

    return (
        <div className={styles.group}>

            <div className={styles.groupHeader} onClick={toggle}>
                <FolderIcon size={16} />
                <span>{group.name}</span>
                <div className={[styles.chevron, isExpanded ? styles.chevronExpanded : ''].filter(Boolean).join(' ')}>
                    <ChevronDownIcon size={14} />
                </div>
            </div>

            <nav className={styles.groupList}>
                {entries.map(item => (
                    <SideBarElement key={item.uid} item={item} />
                ))}
            </nav>

        </div>
    );

}
