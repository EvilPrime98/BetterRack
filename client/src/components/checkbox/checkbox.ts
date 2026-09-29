import { UltraComponent, type UltraElementProps } from "ultra-light-js";
import styles from './checkbox.module.css';

export function Checkbox({
    label,
    checked = false,
    onChange,
    ...props
}: {
    label: string;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
} & UltraElementProps) {

    return UltraComponent({

        component: '<label></label>',

        className: [
            ...(props.className ? props.className : []),
            styles.root
        ],

        children: [

            UltraComponent({
                component: '<input type="checkbox" />',
                className: [styles.input],
                attributes: props.attributes,
                onMount: [
                    ($el) => { ($el as HTMLInputElement).checked = checked; }
                ],
                eventHandler: {
                    change: (e) => onChange?.((e.currentTarget as HTMLInputElement).checked)
                }
            }),

            `<span class="${styles.box}" aria-hidden="true">
                <svg class="${styles.check}" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.25 4.9 8.6 9.5 3.6" />
                </svg>
            </span>`,

            `<span class="${styles.label}">${label}</span>`

        ]

    });

}
