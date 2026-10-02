import { createRoot } from 'react-dom/client';
import './main.css';
import { Providers } from './Providers';
import { ErrorBoundary } from './ErrorBoundary';
import { App } from './App';
import { registerDesktopCloseGuard } from './services/close-guard.service';

declare global {
    interface Window {
        versions?: {
            chrome: string;
            node: string;
            electron: string;
            platform: string;
        };
        desktop?: {
            pickLibraryFolder(): Promise<string | null>;
            toggleFullscreen(): Promise<void>;
            minimizeWindow(): Promise<void>;
            toggleMaximizeWindow(): Promise<void>;
            closeWindow(): Promise<void>;
            isWindowMaximized(): Promise<boolean>;
            onMaximizedChange(callback: (isMaximized: boolean) => void): () => void;
            confirmClose(): Promise<void>;
            cancelClose(): Promise<void>;
            onCloseRequested(callback: (activeDownloads: number) => void): () => void;
        };
    }
}

registerDesktopCloseGuard();

const platform = window.versions?.platform;
if (platform) document.documentElement.dataset.platform = platform;

createRoot(document.getElementById('root')!).render(
    <Providers>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </Providers>
);
