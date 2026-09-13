import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './sidebar.module.css';
import { useLibraryStore } from '@/stores/library.store';
import { useSidebarStore } from '@/stores/sidebar.store';
import { FolderIcon } from '@/icons/folder.icon';
import { ChevronDownIcon } from '@/icons/chevron.icon';
import type { ILibraryMetadataGroup } from '@/library.types';

export function SideBarMetadataGroup({
    group
}: {
    group: ILibraryMetadataGroup
}) {

    const [isExpanded, setIsExpanded] = useState(false);
    const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
    const setIsExpandedSidebar = useSidebarStore((s) => s.setIsExpanded);

    function toggle() {
        setIsExpanded(!isExpanded);
    }

    function closeSidebar() {
        setSearchQuery('');
        setIsExpandedSidebar(false);
    }

    return (
        <div className={styles.group}>

            <div className={styles.groupHeader} onClick={toggle}>
                <FolderIcon size={16} />
                <span>{group.key}</span>
                <div className={[styles.chevron, isExpanded ? styles.chevronExpanded : ''].filter(Boolean).join(' ')}>
                    <ChevronDownIcon size={14} />
                </div>
            </div>

            <nav className={styles.groupList}>
                {isExpanded && group.entries.map(entry => (
                    <Link key={entry.uid} to={`/${entry.uid}/reader`} className={styles.item} onClick={closeSidebar}>
                        <span>{entry.name}</span>
                    </Link>
                ))}
            </nav>

        </div>
    );

}
