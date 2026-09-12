import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './new-folder-modal.module.css';
import { BRButton } from "@/components/br-button/br-button";
import { useNewFolderModalContext } from "@/context/NewFolderModalContext";

export function NewFolderModal() {

    const { isVisible, closeNewFolderModal, submitNewFolder } = useNewFolderModalContext();

    const [text, setText] = useState('');
    const textRef = useRef(text);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        textRef.current = text;
    }, [text]);

    const cancel = () => closeNewFolderModal();
    const submit = () => submitNewFolder(textRef.current);

    // Reads textRef.current (kept fresh above) rather than `text`, so it never closes over a stale value.
    useEffect(() => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cancel();
            if (e.key === 'Enter') submit();
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
        
    }, []);

    useLayoutEffect(() => {
        if (!isVisible || !inputRef.current) return;
        inputRef.current.value = '';
        setText('');
        inputRef.current.focus();
    }, [isVisible]);

    return (
        <div className={styles.overlay} style={{ display: isVisible ? undefined : 'none' }}>

            <div className={styles.backdrop} onClick={cancel} />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Create folder"
                className={styles.modal}
            >

                <p className={styles.title}>New folder</p>

                <input
                    ref={inputRef}
                    type="text"
                    className={styles.field}
                    placeholder="Folder name"
                    onChange={(e) => setText(e.currentTarget.value)}
                />

                <div className={styles.actions}>
                    <BRButton 
                        text="Cancel" 
                        variant="secondary" 
                        onClick={cancel} 
                    />
                    <BRButton 
                        text="Create" 
                        variant="classic" 
                        onClick={submit} 
                    />
                </div>

            </div>

        </div>
    );

}
