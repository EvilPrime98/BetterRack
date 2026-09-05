import type { ButtonHTMLAttributes } from 'react';
import styles from './br-button.module.css';
import { BR_BUTTON_VARIANTS, type TBrButtonVariant } from './variants';

interface BRButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    text: string;
    variant?: TBrButtonVariant;
}

export function BRButton({
    text,
    variant = BR_BUTTON_VARIANTS.classic,
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
