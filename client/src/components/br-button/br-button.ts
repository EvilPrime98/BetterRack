import { UltraComponent, type UltraElementProps } from "ultra-light-js";
import styles from './br-button.module.css';

export function BRButton({
    text,
    variant = 'primary',
    ...props
}: {
    text: string;
    variant?: 'primary' | 'secondary' | 'ghost';
} & UltraElementProps) {

    return UltraComponent({

        ...props,

        component: `<button type="button">${text}</button>`,

        className: [
            styles.button,
            styles[variant],
            ...(props.className ? props.className : []),
        ],

    })

}
