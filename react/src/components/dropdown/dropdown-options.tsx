import { useEffect, useState } from 'react';
import styles from './dropdown-options.module.css';
import { ChevronDownIcon } from '@/icons/chevron.icon';
import { FILTER_OPTIONS, type ILibraryFilters, type TFilterOptions } from '@/library.types';
import { useUserPrefStore } from '@/stores/userPref.store';

export function DropdownOptions({
    filters,
    setFilters,
    resetFilters
}: {
    filters: ILibraryFilters;
    setFilters: (updates: Partial<ILibraryFilters>) => void;
    resetFilters: () => void;
}) {

    const [isOpen, setOpen] = useState(false);

    const [selected, setSelected] = useState<TFilterOptions>(
        filters.sortByReleaseDate
            ? FILTER_OPTIONS.byReleaseDate
            : FILTER_OPTIONS.nofilters
    );

    const closeMenu = () => setOpen(false);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!isOpen);
    };

    useEffect(() => {
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    useEffect(() => {
        useUserPrefStore.getState().setPref({ filter: selected });
    }, [selected]);

    return (
        <div
            className={[styles.dropdown, isOpen ? styles.open : ''].filter(Boolean).join(' ')}
            onClick={toggleMenu}
        >

            <span className={styles.label}>{selected}</span>

            <ChevronDownIcon size={14} />

            {/* UltraActivity: always mounted, visibility toggled via display */}
            <ul className={styles.menu} style={{ display: isOpen ? undefined : 'none' }}>

                <li
                    className={styles.option}
                    onClick={(e) => {
                        e.stopPropagation();
                        resetFilters();
                        setSelected(FILTER_OPTIONS.nofilters);
                        setOpen(false);
                    }}
                >
                    {FILTER_OPTIONS.nofilters}
                </li>

                <li
                    className={styles.option}
                    onClick={(e) => {
                        e.stopPropagation();
                        setFilters({ sortByReleaseDate: true });
                        setSelected(FILTER_OPTIONS.byReleaseDate);
                        setOpen(false);
                    }}
                >
                    {FILTER_OPTIONS.byReleaseDate}
                </li>

            </ul>

        </div>
    );

}
