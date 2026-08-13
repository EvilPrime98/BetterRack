import styles from './loader.module.css';

export function Loader({
    visible,
    label
}: {
    visible: boolean;
    label?: string;
}) {

    return (
        <div className={styles.loader} style={{ display: visible ? undefined : 'none' }}>
            <div className={styles.spinner} />
            {label && <p className={styles.label}>{label}</p>}
        </div>
    );

}
