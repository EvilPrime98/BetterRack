import { API_URL } from "../services/library.service";
import { withAuthQuery } from "../services/server-config.service";
import type { ILibraryResponseItem } from "../library.types";

const pickedByKey = new Map<string, string>();
const BG_IMAGE_PROPERTY = '--bg-image';

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
        $el.style.removeProperty(BG_IMAGE_PROPERTY);
        return;
    }

    if ($el.style.getPropertyValue(BG_IMAGE_PROPERTY) === `url("${url}")`) return;

    const preload = new Image();

    preload.onload = () => {
        $el.style.setProperty(BG_IMAGE_PROPERTY, `url("${url}")`);
        $el.classList.add('view-background');
    };

    preload.onerror = () => {
        pickedByKey.delete(key);
        $el.classList.remove('view-background');
        $el.style.removeProperty(BG_IMAGE_PROPERTY);
    };

    preload.src = url;

}
