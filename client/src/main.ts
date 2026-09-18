import { UltraErrorBoundary } from "ultra-light-js";
import { App } from "./App";
import { AppLoader } from "./components/app-loader/app-loader";

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
        };
    }
}

const platform = window.versions?.platform;
if (platform) document.documentElement.dataset.platform = platform;

const $app = document.getElementById('root');

$app?.appendChild(
    UltraErrorBoundary({
        factories: App,
        fallback: (e) => AppLoader({
           message: e instanceof Error 
           ? `${e.stack}`
           : 'There was an error'
        })
    })
)