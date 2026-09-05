import { UltraComponent, type UltraElementProps } from "ultra-light-js";
import styles from './br-button.module.css';
import { BR_BUTTON_VARIANTS, type TBrButtonVariant } from './variants';

export function BRButton({
    text,
    variant = BR_BUTTON_VARIANTS.classic,
    ...props
}: {
    text: string;
    variant?: TBrButtonVariant;
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
