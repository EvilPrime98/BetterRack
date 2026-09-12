import type { ButtonHTMLAttributes } from 'react';
import styles from './br-button.module.css';

export const BR_BUTTON_VARIANTS = {
    primary: 'primary',
    secondary: 'secondary',
    ghost: 'ghost',
    classic: 'classic'
} as const; 

interface BRButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    text: string;
    variant?: keyof typeof BR_BUTTON_VARIANTS;
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
            className={[
                styles.button, 
                styles[variant], 
                className].filter(Boolean).join(' ')
            }
            {...props}
        >
            {text}
            {children}
        </button>
    );

}
