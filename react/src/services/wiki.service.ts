import type { WikiComic } from "better-wiki";
import { DEFAULT_IMAGE_SIZE } from "../data";
import { API_URL } from "./library.service";
import { authHeaders } from "./server-config.service";

export async function fetchComics(
    title: string,
    thumbnailSize: number = DEFAULT_IMAGE_SIZE
): Promise<WikiComic[]> {

    const params = new URLSearchParams({ title, thumbnailSize: String(thumbnailSize) });
    const response = await fetch(`${API_URL}/api/wiki/comics?${params}`, { headers: authHeaders() });
    return await response.json();

}

export async function fetchComicById(
    id: number,
    sourceWiki: string
): Promise<WikiComic> {
    const params = new URLSearchParams({ sourceWiki })
    const response = await fetch(`${API_URL}/api/wiki/comic/${id}?${params.toString()}`, { headers: authHeaders() });
    return await response.json();
}

export function wikiImageOptimizer(
    wikiImageSrc: string,
    size?: number
): string {
    if (wikiImageSrc.includes('scale-to-width-down')) {
        const [basePath, imagePath] = wikiImageSrc.split('/revision/latest/');
        const cbIdent = imagePath.split('?')[1];
        if (!size) return `${basePath}/revision/latest?${cbIdent}`;
        return `${basePath}/revision/latest/scale-to-width-down/${Math.ceil(size)}?${cbIdent}`;
    }
    return wikiImageSrc
}
