import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './sidebar.module.css';
import { useSidebarStore } from '@/stores/sidebar.store';
import { useLibraryStore } from '@/stores/library.store';
import { useLibraryMetadataStore } from '@/stores/libraryMetadata.store';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { SideBarGroup } from './sidebar-group';
import { SideBarMetadataGroup } from './sidebar-metadata-group';
import { GroupModeSelect } from './group-mode-select';
import { ScanMetadataButton } from './scan-metadata-button';
import { RefreshLibraryButton } from './refresh-button';
import { SidebarCloseButton } from './close-button';
import { SidebarSearch } from './sidebar-search';
import { Footer } from '@/components/footer/footer';
import { GearIcon } from '@/icons/gear.icon';
import { ShopIcon } from '@/icons/shop.icon';
import { DownloadIcon } from '@/icons/download.icon';
import { BookmarkIcon } from '@/icons/bookmark.icon';
import { LIBRARY_METADATA_FIELD_LABELS, type TLibraryMetadataField } from '@/library.types';

export function SideBar() {

    const asideRef = useRef<HTMLElement>(null);
    const isExpanded = useSidebarStore((s) => s.isExpanded);
    const setIsExpanded = useSidebarStore((s) => s.setIsExpanded);
    const isCollapsed = useSidebarStore((s) => s.isCollapsed);
    const groups = useLibraryStore((s) => s.groups);
    const fetchLibrary = useLibraryStore((s) => s.fetchLibrary);
    const [isLoading, setIsLoading] = useState(false);
    const isDesktop = useIsDesktop();
    const groupMode = useLibraryMetadataStore((s) => s.mode);
    const metadataGroups = useLibraryMetadataStore((s) => s.groups);
    const isScanningMetadata = useLibraryMetadataStore((s) => s.isScanning);

    const isHidden = isDesktop ? isCollapsed : !isExpanded;

    function closeSidebar() {
        setIsExpanded(false);
    }

    useEffect(() => {
        setIsLoading(true);
        fetchLibrary().finally(() => setIsLoading(false));      
    }, []);

    useEffect(() => {
        function onKeydown(event: KeyboardEvent) {
            if (event.key === 'Escape') closeSidebar();
        }
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, []);

    useEffect(() => {
        const $aside = asideRef.current;
        if (!$aside) return;
        if (!isHidden) {
            $aside.removeAttribute('inert');
        } else {
            if ($aside.contains(document.activeElement)) {
                (document.activeElement as HTMLElement).blur();
            }
            $aside.setAttribute('inert', '');
        }
    }, [isHidden]);

    return (
        <div>

            {/*<div
                className={[styles.backdrop, isExpanded ? styles.visible : ''].filter(Boolean).join(' ')}
                onClick={closeSidebar}
            />*/}

            <aside
                ref={asideRef}
                role="navigation"
                aria-label="Library folders"
                className={[
                    styles.sideBar,
                    isExpanded ? styles.expanded : '',
                    isCollapsed ? styles.collapsed : ''
                ].filter(Boolean).join(' ')}
            >

                <div className={styles.header}>
                    <span className={styles.title}>Library</span>
                    <div className={styles.headerActions}>
                        <SidebarCloseButton />
                    </div>
                </div>

                <div className={styles.section}>
                    <span className={styles.sectionTitle}>User</span>
                    <Link to="/settings" className={styles.item} onClick={closeSidebar}>
                        <GearIcon size={16} />
                        <span>Settings</span>
                    </Link>
                </div>

                <div className={styles.section}>
                    <span className={styles.sectionTitle}>Store</span>
                    <Link to="/store" className={styles.item} onClick={closeSidebar}>
                        <ShopIcon size={16} />
                        <span>Store</span>
                    </Link>
                    <Link to="/store/downloads" className={styles.item} onClick={closeSidebar}>
                        <DownloadIcon size={16} />
                        <span>Downloads</span>
                    </Link>
                </div>

                <div className={styles.section}>
                    <span className={styles.sectionTitle}>Browse</span>
                    <Link to="/new" className={styles.item} onClick={closeSidebar}>
                        <BookmarkIcon size={16} />
                        <span>Recently added</span>
                    </Link>
                </div>

                <SidebarSearch />

                <RefreshLibraryButton />

                <GroupModeSelect />

                <ScanMetadataButton />

                <nav className={styles.list}>
                    {groupMode !== 'folder' ? (
                        !metadataGroups.length ? (
                            <p className={styles.emptyState}>
                                {isScanningMetadata
                                    ? 'Scanning library…'
                                    : `Scan the library to browse by ${LIBRARY_METADATA_FIELD_LABELS[groupMode as TLibraryMetadataField]}.`}
                            </p>
                        ) : (
                            metadataGroups.map(group => (
                                <SideBarMetadataGroup key={group.key} group={group} />
                            ))
                        )
                    ) : !groups.length ? (
                        <p className={styles.emptyState}>
                            {isLoading ? 'Loading library…' : 'No folders found'}
                        </p>
                    ) : (
                        groups.map(group => (
                            <SideBarGroup key={group.uid} group={group} />
                        ))
                    )}
                </nav>

                <Footer />

            </aside>

        </div>
    );

}
