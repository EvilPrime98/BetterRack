import { CloseIcon } from '@/icons/close.icon';
import styles from './sidebar.module.css';
import { useSidebarStore } from '@/stores/sidebar.store';

export function SidebarCloseButton() {

    const setIsExpanded = useSidebarStore((s) => s.setIsExpanded);

    function closeSidebar() {
        setIsExpanded(false);
    }

    return (
        <div
            className={styles.button}
            role="button"
            onClick={closeSidebar}
        >
            <CloseIcon size={20} />
        </div>
    );

}
