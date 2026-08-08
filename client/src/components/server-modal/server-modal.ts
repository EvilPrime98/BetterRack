import { UltraActivity, UltraComponent, ultraState } from "ultra-light-js";
import styles from './server-modal.module.css';
import { BRButton } from "@/components/br-button/br-button";
import { SERVER_MODAL_CTX } from "@/context/server-modal.context";
import { getStoredServerUrl } from "@/services/server-config.service";

export function ServerModal() {

    const [text, setText] = ultraState('');

    const cancel = () => SERVER_MODAL_CTX.closeServerModal();

    const submit = () => SERVER_MODAL_CTX.submitServer(text());

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cancel();
        if (e.key === 'Enter') submit();
    }

    const onVisibleChange = ($input: HTMLElement) => {
        if (!SERVER_MODAL_CTX.isVisible.get() || !$input) return;
        const current = getStoredServerUrl();
        setText(current);
        ($input as HTMLInputElement).value = current;
        $input.focus();
    }

    const onError = ($p: HTMLElement) => {
        $p.textContent = SERVER_MODAL_CTX.error.get();
    }

    const onMount = () => {
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }

    return UltraActivity({

        mode: {
            state: SERVER_MODAL_CTX.isVisible.get,
            subscriber: SERVER_MODAL_CTX.isVisible.subscribe
        },

        component: '<div></div>',

        className: [styles.overlay],

        onMount: [onMount],

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.backdrop],
                eventHandler: { click: cancel }
            }),

            UltraComponent({

                component: '<div></div>',

                attributes: {
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': 'Connect to server'
                },

                className: [styles.modal],

                children: [

                    `<p class="${styles.title}">Connect to your server</p>`,

                    `<p class="${styles.hint}">Enter the address of the BetterRack server on your network.</p>`,

                    UltraComponent({
                        component: '<input/>',
                        className: [styles.field],
                        attributes: {
                            type: 'text',
                            placeholder: '192.168.1.100:3000'
                        },
                        eventHandler: {
                            input: (e) => setText((e.currentTarget as HTMLInputElement).value)
                        },
                        trigger: [{
                            subscriber: SERVER_MODAL_CTX.isVisible.subscribe,
                            triggerFunction: onVisibleChange,
                            defer: true
                        }]
                    }),

                    UltraComponent({
                        component: `<p class="${styles.errorText}"></p>`,
                        trigger: [{
                            subscriber: SERVER_MODAL_CTX.error.subscribe,
                            triggerFunction: onError
                        }]
                    }),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.actions],
                        trigger: [{
                            subscriber: SERVER_MODAL_CTX.isMandatory.subscribe,
                            triggerFunction: ($div: HTMLElement) => {
                                $div.replaceChildren(
                                    ...(SERVER_MODAL_CTX.isMandatory.get() ? [] : [
                                        BRButton({
                                            text: 'Cancel',
                                            variant: 'secondary',
                                            eventHandler: { click: cancel }
                                        })
                                    ]),
                                    BRButton({
                                        text: 'Connect',
                                        variant: 'primary',
                                        eventHandler: { click: submit }
                                    })
                                )
                            },
                            defer: true
                        }]
                    })

                ]
            })

        ]
    })

}
