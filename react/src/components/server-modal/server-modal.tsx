import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './server-modal.module.css';
import { BRButton } from '@/components/br-button/br-button';
import { useServerModalStore, getStoredServerUrl } from '@/stores/serverModal.store';
import { isAndroidPlatform, isRemoteModeEnabled, getStoredApiKey } from '@/services/server-config.service';

export function ServerModal() {

    const isVisible = useServerModalStore((s) => s.isVisible);
    const isMandatory = useServerModalStore((s) => s.isMandatory);
    const error = useServerModalStore((s) => s.error);

    const [text, setText] = useState('');
    const [remoteMode, setRemoteMode] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // The keydown listener registers once. It reads the refs, not the state.
    // This lets Escape and Enter always use the latest values.
    const textRef = useRef(text);
    textRef.current = text;
    const remoteModeRef = useRef(remoteMode);
    remoteModeRef.current = remoteMode;
    const apiKeyRef = useRef(apiKey);
    apiKeyRef.current = apiKey;

    const showRemoteModeOption = !isAndroidPlatform();

    const buildRemoteOpts = () => showRemoteModeOption
        ? { enabled: remoteModeRef.current, apiKey: apiKeyRef.current }
        : undefined;

    const cancel = () => useServerModalStore.getState().closeServerModal();
    const submit = () => useServerModalStore.getState().submitServer(textRef.current, buildRemoteOpts());

    useEffect(() => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') useServerModalStore.getState().closeServerModal();
            if (e.key === 'Enter') useServerModalStore.getState().submitServer(textRef.current, buildRemoteOpts());
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, []);

    // Reseed the fields from storage. Focus the address input again each time the modal becomes visible.
    useLayoutEffect(() => {
        if (!isVisible) return;
        const current = getStoredServerUrl();
        setText(current);
        setRemoteMode(isRemoteModeEnabled());
        setApiKey(getStoredApiKey());
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

                {showRemoteModeOption && (
                    <>
                        <label className={styles.hint}>
                            <input
                                type="checkbox"
                                checked={remoteMode}
                                onChange={(e) => setRemoteMode(e.currentTarget.checked)}
                            />
                            {' '}Use this as my library server
                        </label>

                        {remoteMode && (
                            <input
                                className={styles.field}
                                type="text"
                                placeholder="API key (optional)"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.currentTarget.value)}
                            />
                        )}
                    </>
                )}

                <p className={styles.errorText}>{error}</p>

                <div className={styles.actions}>
                    {!isMandatory && (
                        <BRButton text="Cancel" variant="secondary" onClick={cancel} />
                    )}
                    <BRButton 
                        text="Connect" 
                        variant="classic" 
                        onClick={submit}
                    />
                </div>

            </div>

        </div>
    );

}
