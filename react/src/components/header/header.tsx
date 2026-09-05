import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './header.module.css';
import { useSidebarStore } from '@/stores/sidebar.store';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { BurgerIcon } from '@/icons/burger-icon';
import { BetterRackIcon } from '@/icons/better-rack.icon';
import { useLibraryStore } from '@/stores/library.store';

export function Header() {

    const iconSize = 30;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isDesktop = useIsDesktop();
    const isExpanded = useSidebarStore((s) => s.isExpanded);
    const setIsExpanded = useSidebarStore((s) => s.setIsExpanded);
    const isSideBarCollapsed = useSidebarStore((s) => s.isCollapsed);
    const setIsCollapsed = useSidebarStore((s) => s.setIsCollapsed);
    const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);

    function toggleSidebar() {
        if (isDesktop) {
            setIsCollapsed(!isSideBarCollapsed);
        } else {
            setIsExpanded(!isExpanded);
        }
    }

    function goHome() {
        setSearchQuery('');
        if (searchParams.get('search')) navigate('/');
    }

    function onEnterOrSpace(handler: () => void) {
        return (e: React.KeyboardEvent) => {
            const key = e.key;
            if (key !== 'Enter' && key !== ' ') return;
            e.preventDefault();
            handler();
        };
    }

    return (
        <header className={styles.header}>

            <div
                className={[
                    styles.iconBtn,
                    styles.noDrag,
                    styles.burger
                ].filter(Boolean).join(' ')}
                role="button"
                tabIndex={0}
                aria-label="Toggle sidebar"
                aria-hidden={false}
                onClick={toggleSidebar}
                onKeyDown={onEnterOrSpace(toggleSidebar)}
            >
                <BurgerIcon size={iconSize * 1.5} />
            </div>

            <div className={styles.inner}>

                <div className={styles.left}>

                    <Link
                        to="/"
                        aria-label="BetterRack home"
                        className={[styles.logo, styles.noDrag].filter(Boolean).join(' ')}
                        onClick={goHome}
                    >
                        <BetterRackIcon size={iconSize * 1.3} />
                    </Link>

                    <div 
                        className={styles.text} 
                        style={{ userSelect: 'none' }}
                    >
                        <span 
                            className={styles.title} 
                            style={{ fontSize: '1.5rem' }}
                        >
                            BetterRack
                        </span>
                    </div>

                </div>
            </div>

        </header>
    );

}
