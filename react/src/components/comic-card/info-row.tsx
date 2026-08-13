import styles from './comic-card.module.css';

export function InfoRow({
    label,
    value
}: {
    label: string;
    value: string;
}) {

    return (
        <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{label}</span>
            <span className={styles.infoValue}>{value}</span>
        </div>
    );

}
