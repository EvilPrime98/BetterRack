import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './checkbox.module.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
    label: ReactNode;
}

export function Checkbox({
    label,
    className,
    ...props
}: CheckboxProps) {

    return (
        <label className={[styles.root, className].filter(Boolean).join(' ')}>

            <input type="checkbox" className={styles.input} {...props} />

            <span className={styles.box} aria-hidden="true">
                <svg className={styles.check} viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.25 4.9 8.6 9.5 3.6" />
                </svg>
            </span>

            <span className={styles.label}>{label}</span>

        </label>
    );

}
