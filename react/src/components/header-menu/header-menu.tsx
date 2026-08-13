import { useEffect, useState } from 'react';
import styles from './header-menu.module.css';
import headerStyles from '../header/header.module.css';
import { MenuIcon } from '@/icons/menu.icon';
import { useLibraryStore } from '@/stores/library.store';

function onEnterOrSpace(handler: () => void) {
    return (e: React.KeyboardEvent) => {
        const key = e.key;
        if (key !== 'Enter' && key !== ' ') return;
        e.preventDefault();
        handler();
    };
}

export function HeaderMenu() {

    const [isOpen, setOpen] = useState(false);
    const refreshLibrary = useLibraryStore((s) => s.refreshLibrary);

    const closeMenu = () => setOpen(false);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!isOpen);
    };

    const refresh = () => {
        refreshLibrary();
        setOpen(false);
    };

    useEffect(() => {
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    return (
        <div
            className={[styles.menuWrap, headerStyles.noDrag, isOpen ? styles.open : ''].filter(Boolean).join(' ')}
            onClick={toggleMenu}
        >

            <div
                className={headerStyles.iconBtn}
                role="button"
                tabIndex={0}
                aria-haspopup="menu"
                aria-label="More options"
                onKeyDown={onEnterOrSpace(() => setOpen(!isOpen))}
            >
                <MenuIcon size={18} />
            </div>

            {/* UltraActivity: always mounted, visibility toggled via display */}
            <ul className={styles.menu} role="menu" style={{ display: isOpen ? undefined : 'none' }}>

                <li
                    className={styles.option}
                    role="menuitem"
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        refresh();
                    }}
                    onKeyDown={onEnterOrSpace(refresh)}
                >
                    Refresh library
                </li>

            </ul>

        </div>
    );

}
