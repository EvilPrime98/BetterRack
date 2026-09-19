import { useEffect } from 'react';
import styles from './confirm-modal.module.css';
import { BRButton } from '@/components/br-button/br-button';
import { useConfirmModalStore } from '@/stores/confirmModal.store';

export function ConfirmModal() {

    const isVisible = useConfirmModalStore((s) => s.isVisible);
    const title = useConfirmModalStore((s) => s.title);
    const message = useConfirmModalStore((s) => s.message);
    const confirmLabel = useConfirmModalStore((s) => s.confirmLabel);
    const cancelLabel = useConfirmModalStore((s) => s.cancelLabel);
    const hasDontAskAgain = useConfirmModalStore((s) => s.hasDontAskAgain);
    const dontAskAgain = useConfirmModalStore((s) => s.dontAskAgain);

    const cancel = () => useConfirmModalStore.getState().resolveConfirmDialog(false);
    const confirm = () => useConfirmModalStore.getState().resolveConfirmDialog(true);

    useEffect(() => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') useConfirmModalStore.getState().resolveConfirmDialog(false);
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, []);

    return (
        <div className={styles.overlay} style={{ display: isVisible ? undefined : 'none' }}>

            <div className={styles.backdrop} onClick={cancel} />

            <div
                className={styles.modal}
                role="alertdialog"
                aria-modal="true"
                aria-label="Confirm action"
            >

                <p className={styles.title}>{title}</p>

                <p className={styles.message}>{message}</p>

                {hasDontAskAgain && (
                    <label className={styles.dontAskAgain}>
                        <input
                            type="checkbox"
                            checked={dontAskAgain}
                            onChange={(e) => useConfirmModalStore.getState().setDontAskAgain(e.currentTarget.checked)}
                        />
                        Don't ask again
                    </label>
                )}

                <div className={styles.actions}>

                    <BRButton 
                        text={cancelLabel} 
                        variant="secondary" 
                        onClick={cancel}
                    />

                    <BRButton
                        text={confirmLabel}
                        variant="classic"
                        onClick={confirm}
                    />

                </div>

            </div>

        </div>
    );

}
