import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './server-modal.module.css';
import { BRButton } from '@/components/br-button/br-button';
import { useServerModalStore, getStoredServerUrl } from '@/stores/serverModal.store';

export function ServerModal() {

    const isVisible = useServerModalStore((s) => s.isVisible);
    const isMandatory = useServerModalStore((s) => s.isMandatory);
    const error = useServerModalStore((s) => s.error);

    const [text, setText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // The keydown listener is registered once, so it reads through this ref rather than
    // `text` directly, letting Escape/Enter always act on the latest value.
    const textRef = useRef(text);
    textRef.current = text;

    const cancel = () => useServerModalStore.getState().closeServerModal();
    const submit = () => useServerModalStore.getState().submitServer(textRef.current);

    useEffect(() => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') useServerModalStore.getState().closeServerModal();
            if (e.key === 'Enter') useServerModalStore.getState().submitServer(textRef.current);
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, []);

    // Re-seed the input from storage and (re-)focus it every time the modal becomes visible.
    useLayoutEffect(() => {
        if (!isVisible) return;
        const current = getStoredServerUrl();
        setText(current);
        inputRef.current?.focus();
    }, [isVisible]);

    return (
        <div className={styles.overlay} style={{ display: isVisible ? undefined : 'none' }}>

            <div className={styles.backdrop} onClick={cancel} />

            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label="Connect to server"
            >

                <p className={styles.title}>Connect to your server</p>

                <p className={styles.hint}>Enter the address of the BetterRack server on your network.</p>

                <input
                    ref={inputRef}
                    className={styles.field}
                    type="text"
                    placeholder="192.168.1.100:3000"
                    value={text}
                    onChange={(e) => setText(e.currentTarget.value)}
                />

                <p className={styles.errorText}>{error}</p>

                <div className={styles.actions}>
                    {!isMandatory && (
                        <BRButton text="Cancel" variant="secondary" onClick={cancel} />
                    )}
                    <BRButton text="Connect" variant="primary" onClick={submit} />
                </div>

            </div>

        </div>
    );

}
