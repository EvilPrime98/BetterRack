import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { API_URL } from '@/services/library.service';
import { withAuthQuery } from '@/services/server-config.service';
import type { ILibraryResponseItem } from '@/library.types';

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

export function useBackgroundImage(
    items: ILibraryResponseItem[],
    key: string
): string | null {

    const itemsRef = useRef(items);
    itemsRef.current = items;

    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {

        const picked = pickBackgroundUrl(itemsRef.current, key);

        if (!picked) {
            setUrl(null);
            return;
        }

        const preload = new Image();

        preload.onload = () => setUrl(picked);

        preload.onerror = () => {
            pickedByKey.delete(key);
            setUrl(null);
        };

        preload.src = picked;

    }, [key, itemsRef.current.length]);

    return url;

}

export function backgroundImageStyle(
    url: string | null
): CSSProperties | undefined {

    if (!url) return undefined;

    return { '--bg-image': `url("${url}")` } as CSSProperties;

}
