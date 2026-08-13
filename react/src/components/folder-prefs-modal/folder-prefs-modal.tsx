import { useEffect, useRef } from 'react';
import styles from './folder-prefs-modal.module.css';
import { BRButton } from "@/components/br-button/br-button";
import { useFolderPrefsModalContext } from "@/context/FolderPrefsModalContext";

export function FolderPrefsModal() {

    const {
        isVisible, folderName, prefPublisher, recursive, prefCover,
        closeFolderPrefsModal, saveFolderPrefs
    } = useFolderPrefsModalContext();

    const publisherRef = useRef<HTMLInputElement>(null);
    const recursiveRef = useRef<HTMLInputElement>(null);
    const coverRef = useRef<HTMLInputElement>(null);

    const cancel = () => closeFolderPrefsModal();

    const submit = () => {
        if (!publisherRef.current || !recursiveRef.current || !coverRef.current) return;
        saveFolderPrefs({
            prefPublisher: publisherRef.current.value.trim(),
            recursive: recursiveRef.current.checked,
            prefCover: coverRef.current.value.trim()
        });
    }

    useEffect(() => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cancel();
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);        
    }, []);

    useEffect(() => {
        if (publisherRef.current) publisherRef.current.value = prefPublisher;
        if (recursiveRef.current) recursiveRef.current.checked = recursive;
        if (coverRef.current) coverRef.current.value = prefCover;
    }, [prefPublisher, recursive, prefCover]);

    return (
        <div className={styles.overlay} style={{ display: isVisible ? undefined : 'none' }}>

            <div className={styles.backdrop} onClick={cancel} />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Folder preferences"
                className={styles.modal}
            >

                <p className={styles.title}>{`Preferences — ${folderName}`}</p>

                <div className={styles.field}>
                    <label className={styles.label}>Preferred publisher</label>
                    <input
                        ref={publisherRef}
                        type="text"
                        className={styles.input}
                        placeholder="e.g. DC Comics"
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Preferred cover</label>
                    <input
                        ref={coverRef}
                        type="text"
                        className={styles.input}
                        placeholder="Cover image URL"
                    />
                </div>

                <label className={styles.checkboxRow}>
                    <input ref={recursiveRef} type="checkbox" />
                    <span>Apply to subfolders</span>
                </label>

                <p className={styles.hint}>Subfolders without their own preferred publisher will inherit this one.</p>

                <div className={styles.actions}>
                    <BRButton text="Cancel" variant="secondary" onClick={cancel} />
                    <BRButton text="Save" variant="primary" onClick={submit} />
                </div>

            </div>

        </div>
    );

}
