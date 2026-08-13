import { createRoot } from 'react-dom/client';
import './main.css';
import { Providers } from './Providers';
import { ErrorBoundary } from './ErrorBoundary';
import { App } from './App';

declare global {
    interface Window {
        versions?: {
            chrome: string;
            node: string;
            electron: string;
            platform: string;
        };
    }
}

const platform = window.versions?.platform;
if (platform) document.documentElement.dataset.platform = platform;

createRoot(document.getElementById('root')!).render(
    <Providers>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </Providers>
);
