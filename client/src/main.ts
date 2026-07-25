import { App } from "./App";

const platform = (window as any).versions?.platform;
if (platform) document.documentElement.dataset.platform = platform;

const $app = document.getElementById('root');

$app?.appendChild(
    App()
)