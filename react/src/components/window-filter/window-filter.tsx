import { RECENT_WINDOW_OPTIONS, type TRecentWindow } from "@/library.types";
import { useEffect, useState } from "react";
import styles from '@/pages/recent-page.module.css';
import { ChevronDownIcon } from "@/icons/chevron.icon";

export function WindowFilter({
    selected,
    onSelect
}: {
    selected: TRecentWindow;
    onSelect: (option: TRecentWindow) => void;
}) {

    const [isOpen, setOpen] = useState(false);

    useEffect(() => {
        const close = () => setOpen(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, []);

    return (
        <div
            className={[styles.filter, isOpen ? styles.filterOpen : ''].filter(Boolean).join(' ')}
            onClick={(e) => { e.stopPropagation(); setOpen(!isOpen); }}
        >
            <span className={styles.filterLabel}>{selected.label}</span>

            <ChevronDownIcon size={14} />

            <ul className={styles.filterMenu} style={{ display: isOpen ? undefined : 'none' }}>
                {RECENT_WINDOW_OPTIONS.map(option => (
                    <li
                        key={option.hours}
                        className={styles.filterOption}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(option);
                            setOpen(false);
                        }}
                    >
                        {option.label}
                    </li>
                ))}
            </ul>

        </div>
    );

}