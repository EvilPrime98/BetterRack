import { useCallback, useEffect, useRef, useState } from 'react';
import type { ILibraryGroup } from '@/library.types';
import { SideBarElement } from './sider-bar-element';
import { Link } from 'react-router-dom';
import styles from './sidebar.module.css';
import { useSidebarStore } from '@/stores/sidebar.store';
import { useLibraryStore } from '@/stores/library.store';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { SideBarGroup } from './sidebar-group';
import { RefreshLibraryButton } from './refresh-button';
import { SidebarCloseButton } from './close-button';
import { SidebarSearch } from './sidebar-search';
import { BRButton } from '@/components/br-button/br-button';
import { Footer } from '@/components/footer/footer';
import { GearIcon } from '@/icons/gear.icon';
import { ShopIcon } from '@/icons/shop.icon';
import { DownloadIcon } from '@/icons/download.icon';
import { BookmarkIcon } from '@/icons/bookmark.icon';
import { BookOpenIcon } from '@/icons/book-open.icon';

const SERIES_PAGE_SIZE = 50;

function SeriesList({ groups, isHidden }: { groups: ILibraryGroup[]; isHidden: boolean }) {

    const [count, setCount] = useState(SERIES_PAGE_SIZE);

    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some(e => e.isIntersecting)) setCount(c => c + SERIES_PAGE_SIZE);
            },
            { rootMargin: '300px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [count]);

    return (
        <>
            {!isHidden && groups.slice(0, count).map(group => (
                <SideBarElement
                    key={group.uid}
                    item={{ uid: group.uid, did: true, name: group.name, path: group.path, parentId: '', createdAt: 0 }}
                />
            ))}
            {!isHidden && count < groups.length && <div ref={sentinelRef} style={{ height: 1 }} />}
        </>
    );

}

export function SideBar() {

    const asideRef = useRef<HTMLElement>(null);
    const isExpanded = useSidebarStore((s) => s.isExpanded);
    const setIsExpanded = useSidebarStore((s) => s.setIsExpanded);
    const isCollapsed = useSidebarStore((s) => s.isCollapsed);
    const groups = useLibraryStore((s) => s.groups);
    const fetchLibrary = useLibraryStore((s) => s.fetchLibrary);
    const structure = useLibraryStore((s) => s.structure);
    const setStructure = useLibraryStore((s) => s.setStructure);
    const [isLoading, setIsLoading] = useState(false);
    const isDesktop = useIsDesktop();

    const isHidden = isDesktop ? isCollapsed : !isExpanded;

    function closeSidebar() {
        setIsExpanded(false);
    }

    useEffect(() => {
        setIsLoading(true);
        fetchLibrary().finally(() => setIsLoading(false));
    }, [fetchLibrary]);

    useEffect(() => {
        function onKeydown(event: KeyboardEvent) {
            if (event.key === 'Escape') setIsExpanded(false);
        }
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, [setIsExpanded]);

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
                    <Link to="/reading" className={styles.item} onClick={closeSidebar}>
                        <BookOpenIcon size={16} />
                        <span>Keep reading</span>
                    </Link>
                </div>

                <SidebarSearch />

                <RefreshLibraryButton />

                <div className={styles.section}>
                    <span className={styles.sectionTitle}>Structure</span>
                    <div role="group" aria-label="Library structure" className={styles.toggleGroup}>
                        {(['folders', 'series'] as const).map(option => (
                            <BRButton
                                key={option}
                                text={option === 'folders' ? 'Folders' : 'By series'}
                                variant={structure === option ? 'secondary' : 'ghost'}
                                className={styles.toggleButton}
                                aria-pressed={structure === option}
                                onClick={() => setStructure(option)}
                            />
                        ))}
                    </div>
                </div>

                <nav className={styles.list}>
                    {!groups.length ? (
                        <p className={styles.emptyState}>
                            {isLoading ? 'Loading library…' : 'No folders found'}
                        </p>
                    ) : structure === 'series' ? (
                        <SeriesList groups={groups} isHidden={isHidden} />
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
