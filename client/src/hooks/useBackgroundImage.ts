import { API_URL } from "../services/library.service";
import { withAuthQuery } from "../services/server-config.service";
import type { ILibraryResponseItem } from "../library.types";

const pickedByKey = new Map<string, string>();

function pickBackgroundUrl(
    items: ILibraryResponseItem[],
    key: string
): string | null {

    const existing = pickedByKey.get(key);
    if (existing) return existing;

    const candidates = items.filter(item => !item.did);
    if (!candidates.length) return null;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)]!;
    const url = withAuthQuery(`${API_URL}/api/background/${chosen.uid}`);
    pickedByKey.set(key, url);

    return url;

}

export function applyBackgroundImage(
    $el: HTMLElement,
    items: ILibraryResponseItem[],
    key: string
): void {

    const url = pickBackgroundUrl(items, key);

    if (!url) {
        $el.classList.remove('view-background');
        $el.style.backgroundImage = '';
        return;
    }

    if ($el.style.backgroundImage === `url("${url}")`) return;

    const preload = new Image();

    preload.onload = () => {
        $el.style.backgroundImage = `url("${url}")`;
        $el.classList.add('view-background');
    };

    preload.onerror = () => {
        pickedByKey.delete(key);
        $el.classList.remove('view-background');
        $el.style.backgroundImage = '';
    };

    preload.src = url;

}
