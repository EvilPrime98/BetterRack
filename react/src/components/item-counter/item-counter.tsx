import styles from './item-counter.module.css';
import type { ILibraryResponseItem } from '@/library.types';

export function ItemCounter({
    items
}: {
    items: ILibraryResponseItem[]
}) {

    return <span className={styles.counter}>{items.length} comics</span>;

}
