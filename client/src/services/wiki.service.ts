import type { WikiComic } from "better-wiki";
import { DEFAULT_IMAGE_SIZE } from "../data";
import { API_URL } from "./library.service";
import { API_PREFIX, authHeaders } from "./server-config.service";

export async function fetchComics(
    title: string,
    thumbnailSize: number = DEFAULT_IMAGE_SIZE
): Promise<WikiComic[]> {

    const params = new URLSearchParams({ title, thumbnailSize: String(thumbnailSize) });
    const response = await fetch(`${API_URL}${API_PREFIX}/wiki/comics?${params}`, { headers: authHeaders() });
    return await response.json();

}