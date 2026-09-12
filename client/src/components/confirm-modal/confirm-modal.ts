import { UltraActivity, UltraComponent } from "ultra-light-js";
import styles from './confirm-modal.module.css';
import { BRButton } from "@/components/br-button/br-button";
import { CONFIRM_MODAL_CTX } from "@/context/confirm-modal.context";

export function ConfirmModal() {

    const cancel = () => CONFIRM_MODAL_CTX.resolveConfirmDialog(false);
    const confirm = () => CONFIRM_MODAL_CTX.resolveConfirmDialog(true);

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cancel();
    }

    return UltraActivity({

        mode: {
            state: CONFIRM_MODAL_CTX.isVisible.get,
            subscriber: CONFIRM_MODAL_CTX.isVisible.subscribe
        },

        component: '<div></div>',

        className: [styles.overlay],

        onMount: [
            () => {
                document.addEventListener('keydown', onKeydown);
                return () => document.removeEventListener('keydown', onKeydown);
            }
        ],

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.backdrop],
                eventHandler: { click: cancel }
            }),

            UltraComponent({

                component: '<div></div>',

                attributes: {
                    role: 'alertdialog',
                    'aria-modal': 'true',
                    'aria-label': 'Confirm action'
                },

                className: [styles.modal],

                children: [

                    UltraComponent({
                        component: `<p class="${styles.title}"></p>`,
                        trigger: [{
                            subscriber: CONFIRM_MODAL_CTX.title.subscribe,
                            triggerFunction: ($p: HTMLElement) => {
                                $p.textContent = CONFIRM_MODAL_CTX.title.get();
                            }
                        }],
                        onMount: [
                            ($p: HTMLElement) => { $p.textContent = CONFIRM_MODAL_CTX.title.get(); }
                        ]
                    }),

                    UltraComponent({
                        component: `<p class="${styles.message}"></p>`,
                        trigger: [{
                            subscriber: CONFIRM_MODAL_CTX.message.subscribe,
                            triggerFunction: ($p: HTMLElement) => {
                                $p.textContent = CONFIRM_MODAL_CTX.message.get();
                            }
                        }],
                        onMount: [
                            ($p: HTMLElement) => { $p.textContent = CONFIRM_MODAL_CTX.message.get(); }
                        ]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.actions],
                        children: [

                            BRButton({
                                text: CONFIRM_MODAL_CTX.cancelLabel.get(),
                                variant: 'secondary',
                                eventHandler: { click: cancel },
                                trigger: [{
                                    subscriber: CONFIRM_MODAL_CTX.cancelLabel.subscribe,
                                    triggerFunction: ($btn: HTMLElement) => {
                                        $btn.textContent = CONFIRM_MODAL_CTX.cancelLabel.get();
                                    }
                                }]
                            }),

                            BRButton({
                                text: CONFIRM_MODAL_CTX.confirmLabel.get(),
                                variant: 'classic',
                                eventHandler: { click: confirm },
                                trigger: [{
                                    subscriber: CONFIRM_MODAL_CTX.confirmLabel.subscribe,
                                    triggerFunction: ($btn: HTMLElement) => {
                                        $btn.textContent = CONFIRM_MODAL_CTX.confirmLabel.get();
                                    }
                                }]
                            })

                        ]
                    })

                ]
            })

        ]
    })

}
