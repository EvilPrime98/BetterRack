import { App } from "./App";

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

const $app = document.getElementById('root');

$app?.appendChild(
    App()
)