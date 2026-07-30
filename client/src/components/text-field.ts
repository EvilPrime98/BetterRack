import { UltraComponent } from "ultra-light-js";
import type { TFieldKey } from "../settings.types";
import styles from '../pages/settings.page.module.css';
import { SETTINGS_CONTEXT } from "../context/settings.context";

export function TextField({
    key,
    label,
    placeholder,
    onKeydown
}: {
    key: TFieldKey;
    label: string;
    placeholder?: string;
    onKeydown: (e: Event) => void;
}) {

    function onFieldMount($el: HTMLElement) {
        const $input = $el as HTMLInputElement;
        $input.value = SETTINGS_CONTEXT.settings.get()[key] ?? '';
    }

    return UltraComponent({
        component: '<div></div>',
        className: [styles.field],
        children: [
            `<label class="${styles.label}" for="settings-${key}">${label}</label>`,
            UltraComponent({
                component: `<input id="settings-${key}" type="text" />`,
                className: [styles.input],
                attributes: { placeholder: placeholder ?? '' },
                onMount: [onFieldMount],
                trigger: [{
                    subscriber: SETTINGS_CONTEXT.settings.subscribe,
                    triggerFunction: onFieldMount,
                    defer: true
                }],
                eventHandler: {
                    keydown: onKeydown
                }
            })
        ]
    });

}