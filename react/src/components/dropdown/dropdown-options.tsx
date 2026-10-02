import { useEffect, useId, useState } from 'react';
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
    const menuId = useId();

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!isOpen);
    };

    const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const handleOptionKeyDown = (e: React.KeyboardEvent, onSelect: () => void) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onSelect();
        }
    };

    useEffect(() => {
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    const title = useLibraryStore((s) => s.groups)
    .map(g => g.entries).flat().find(e => e.uid === uid)?.name || '';

    return (
        <div
            className={[styles.dropdown, isOpen ? styles.open : '']
                .filter(Boolean).join(' ')
            }
        >

            <button
                type="button"
                onClick={toggleMenu}
                onKeyDown={handleTriggerKeyDown}
                className={styles.trigger}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={menuId}
                aria-label={`Sort options, currently ${title || 'Root'}`}
            >

                <span
                    title={title}
                    className={styles.label}
                >
                    {title || 'Root'}
                </span>

                <ChevronDownIcon size={14} />

            </button>

            <ul
                id={menuId}
                className={styles.menu}
                role="listbox"
            >

                <li
                    className={styles.option}
                    role="option"
                    aria-selected={!filters.sortByReleaseDate}
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        resetFilters();
                        setOpen(false);
                    }}
                    onKeyDown={(e) => handleOptionKeyDown(e, () => {
                        resetFilters();
                        setOpen(false);
                    })}
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
                    role="option"
                    aria-selected={filters.sortByReleaseDate}
                    tabIndex={0}
                    onClick={(e) => {
                        e.stopPropagation();
                        setFilters({ sortByReleaseDate: true });
                        setOpen(false);
                    }}
                    onKeyDown={(e) => handleOptionKeyDown(e, () => {
                        setFilters({ sortByReleaseDate: true });
                        setOpen(false);
                    })}
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
