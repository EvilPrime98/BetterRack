import type { ButtonHTMLAttributes } from 'react';
import styles from './br-button.module.css';

interface BRButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    text: string;
    variant?: 'primary' | 'secondary' | 'ghost';
}

export function BRButton({
    text,
    variant = 'primary',
    className,
    children,
    ...props
}: BRButtonProps) {

    return (
        <button
            type="button"
            className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
            {...props}
        >
            {text}
            {children}
        </button>
    );

}
