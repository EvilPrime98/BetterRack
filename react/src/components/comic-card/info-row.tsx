import styles from './comic-card.module.css';

const notDisplayable = ['', 'undefined'];

export function InfoRow({
    label,
    value,
    onClick
}: {
    label: string;
    value: string;
    onClick?: () => void;
}) {

    if (notDisplayable.includes(value)) {
        return null
    }

    const clickable = Boolean(onClick);

    return (
        <div
            className={[styles.infoRow, clickable ? styles.infoRowClickable : ''].filter(Boolean).join(' ')}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={onClick}
            onKeyDown={clickable ? (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                onClick?.();
            } : undefined}
        >
            <span className={styles.infoLabel}>{label}</span>
            <span className={styles.infoValue}>{value}</span>
        </div>
    );

}
