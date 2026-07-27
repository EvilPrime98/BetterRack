import type { WikiComic } from "better-wiki";
import { DEFAULT_IMAGE_SIZE } from "../data";
import { API_URL } from "./library.service";

export async function fetchComic(
    title: string,
    thumbnailSize: number = DEFAULT_IMAGE_SIZE
): Promise<WikiComic | null> {

    const params = new URLSearchParams({ title, thumbnailSize: String(thumbnailSize) });
    const response = await fetch(`${API_URL}/api/wiki/comic?${params}`);
    return await response.json();

}

export async function fetchComicById(
    pageId: number,
    sourceWiki: string,
    thumbnailSize: number = DEFAULT_IMAGE_SIZE
): Promise<WikiComic | null> {

    const params = new URLSearchParams({ sourceWiki, thumbnailSize: String(thumbnailSize) });
    const response = await fetch(`${API_URL}/api/wiki/comic/${pageId}?${params}`);
    return await response.json();

}

export async function fetchComics(
    title: string,
    thumbnailSize: number = DEFAULT_IMAGE_SIZE
): Promise<WikiComic[]> {

    const params = new URLSearchParams({ title, thumbnailSize: String(thumbnailSize) });
    const response = await fetch(`${API_URL}/api/wiki/comics?${params}`);
    return await response.json();

}
