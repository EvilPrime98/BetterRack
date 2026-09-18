import { useEffect, useState } from 'react';
import styles from './window-controls.module.css';
import { isDesktopApp } from '@/services/server-config.service';

export function WindowControls() {

    // macOS keeps its native traffic lights
    const isEnabled = isDesktopApp() && window.versions?.platform !== 'darwin';
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (!isEnabled) return;
        window.desktop?.isWindowMaximized().then(setIsMaximized);
        return window.desktop?.onMaximizedChange(setIsMaximized);
    }, [isEnabled]);

    if (!isEnabled) return null;

    return (
        <div className={styles.controls}>

            <button
                type="button"
                className={styles.button}
                aria-label="Minimize"
                onClick={() => window.desktop?.minimizeWindow()}
            >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
                    <path d="M0 5.5H10" />
                </svg>
            </button>

            <button
                type="button"
                className={styles.button}
                aria-label={isMaximized ? 'Restore' : 'Maximize'}
                onClick={() => window.desktop?.toggleMaximizeWindow()}
            >
                {isMaximized ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
                        <path d="M2.5 2.5V0.5H9.5V7.5H7.5" />
                        <rect x="0.5" y="2.5" width="7" height="7" />
                    </svg>
                ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
                        <rect x="0.5" y="0.5" width="9" height="9" />
                    </svg>
                )}
            </button>

            <button
                type="button"
                className={[styles.button, styles.close].join(' ')}
                aria-label="Close"
                onClick={() => window.desktop?.closeWindow()}
            >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
                    <path d="M0.5 0.5L9.5 9.5M9.5 0.5L0.5 9.5" />
                </svg>
            </button>

        </div>
    );

}
