import { useEffect, useState } from 'react';
import styles from './dropdown-options.module.css';
import { ChevronDownIcon } from '@/icons/chevron.icon';
import { FILTER_OPTIONS, type ILibraryFilters } from '@/library.types';
import { useLibraryStore } from '@/stores/library.store';

export function DropdownOptions({
    uid,
    filters,
    setFilters,
    resetFilters
}: {
    uid?: string;
    filters: ILibraryFilters;
    setFilters: (updates: Partial<ILibraryFilters>) => void;
    resetFilters: () => void;
}) {

    const [isOpen, setOpen] = useState(false);
    const closeMenu = () => setOpen(false);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!isOpen);
    };

    useEffect(() => {
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    const title = useLibraryStore((s) => s.groups)
    .map(g => g.entries).flat().find(e => e.uid === uid)?.name || '';

    return (
        <div
            onClick={toggleMenu}
            className={[styles.dropdown, isOpen ? styles.open : '']
                .filter(Boolean).join(' ')
            }
        >

            <span 
                title={title}
                className={styles.label}
            >
                {title || 'Root'}
            </span>

            <ChevronDownIcon size={14} />

            <ul
                className={styles.menu}
                style={{
                    display: isOpen ? undefined : 'none'
                }}
            >

                <li
                    className={styles.option}
                    onClick={(e) => {
                        e.stopPropagation();
                        resetFilters();
                        setOpen(false);
                    }}
                >
                    {
                        !filters.sortByReleaseDate
                            ? <ChevronDownIcon orientation='right' />
                            : null
                    }
                    {FILTER_OPTIONS.nofilters}
                </li>

                <li
                    className={styles.option}
                    onClick={(e) => {
                        e.stopPropagation();
                        setFilters({ sortByReleaseDate: true });
                        setOpen(false);
                    }}
                >
                    {
                        filters.sortByReleaseDate
                            ? <ChevronDownIcon orientation='right' />
                            : null
                    }
                    {FILTER_OPTIONS.byReleaseDate}
                </li>

            </ul>

        </div>
    );

}
