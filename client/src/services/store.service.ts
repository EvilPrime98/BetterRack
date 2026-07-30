import { API_URL } from "./library.service";
import type { IStoreLink, IStorePost, TStoreProgressEvent, TStoreStrat } from "../store.types";

async function parseJsonResponse<T>(response: Response): Promise<T> {
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
}

export async function searchComics(params: {
    search: string;
    page?: number;
    perPage?: number;
    exact?: boolean;
}): Promise<IStorePost[]> {
    const searchParams = new URLSearchParams({ search: params.search });
    if (params.page) searchParams.set('page', String(params.page));
    if (params.perPage) searchParams.set('perPage', String(params.perPage));
    if (params.exact) searchParams.set('exact', 'true');
    const response = await fetch(`${API_URL}/api/comics?${searchParams}`);
    return parseJsonResponse(response);
}

export async function getLatestComics(params?: {
    page?: number;
    perPage?: number;
}): Promise<IStorePost[]> {
    const searchParams = new URLSearchParams({ latest: 'true' });
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.perPage) searchParams.set('perPage', String(params.perPage));
    const response = await fetch(`${API_URL}/api/comics?${searchParams}`);
    return parseJsonResponse(response);
}

export async function getComicLinks(
    id: number,
    strat: TStoreStrat = 'all'
): Promise<IStoreLink[]> {
    const response = await fetch(`${API_URL}/api/comics/${id}/links?strat=${strat}`);
    const data = await parseJsonResponse<{ error: boolean; message: string; links: IStoreLink[] }>(response);
    return data.links;
}

export function downloadComic({
    id,
    title,
    uuid,
    outputDir,
    strat,
    onProgress
}: {
    id: number;
    title: string;
    uuid: string;
    outputDir: string;
    strat?: TStoreStrat;
    onProgress: (event: TStoreProgressEvent) => void;
}): Promise<void> {

    return new Promise((resolve, reject) => {

        const searchParams = new URLSearchParams({ id: String(id), title, uuid, outputDir });
        if (strat) searchParams.set('strat', strat);

        const es = new EventSource(`${API_URL}/api/downloads?${searchParams}`);

        es.onmessage = (e) => {
            const event: TStoreProgressEvent = JSON.parse(e.data);
            onProgress(event);
            if (event.type === 'done') {
                es.close();
                resolve();
            } else if (event.type === 'error') {
                es.close();
                reject(new Error(event.message));
            }
        };

        es.onerror = () => {
            es.close();
            reject(new Error('Lost connection to the server while downloading.'));
        };

    });

}
