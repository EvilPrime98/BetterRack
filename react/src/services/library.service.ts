import type { WikiComic } from "better-wiki";
import type { IReadResponse, IBookmarksResponse, ILibraryGroup, ILibraryMetadataGroup, ILibraryMetadataScanProgress, ILibraryPage, ILibraryRefreshResponse, ILibraryResponseItem, IRecentlyAddedResponse, TLibraryMetadataField } from "../library.types";
import { API_URL, authHeaders } from "./server-config.service";
import { POLL_INTERVAL_MS } from "../data";

export { API_URL };

// GET /api/library is paginated (ILibraryPage, not a bare group array). Walk every
// page and merge the slices back into one group list, because the store and
// getLibraryItems() expect the whole library in memory.
export async function getLibrary(): Promise<ILibraryGroup[]> {
    const merged = new Map<string, ILibraryGroup>();
    let offset = 0;

    for (;;) {
        const response = await fetch(`${API_URL}/api/library?offset=${offset}`, { headers: authHeaders() });
        const page = await response.json();
        if (!response.ok) throw new Error((page as { message?: string })?.message || 'Failed to load library.');

        const { groups, hasMore, limit } = page as ILibraryPage;

        for (const group of groups) {
            const existing = merged.get(group.uid);
            if (!existing) {
                merged.set(group.uid, { ...group, entries: [...group.entries] });
                continue;
            }
            const seen = new Set(existing.entries.map(entry => entry.uid));
            for (const entry of group.entries) {
                if (!seen.has(entry.uid)) existing.entries.push(entry);
            }
        }

        if (!hasMore) break;
        offset += limit;
    }

    return [...merged.values()];
}

export async function getRecentlyAdded(windowHours?: number): Promise<IRecentlyAddedResponse> {
    const query = typeof windowHours === 'number' && windowHours > 0
        ? `?${new URLSearchParams({ windowHours: String(windowHours) })}`
        : '';
    const response = await fetch(`${API_URL}/api/library/recent${query}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error((data as { message?: string })?.message || 'Failed to load recently added comics.');
    return data as IRecentlyAddedResponse;
}

export async function refreshLibrary(): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/refresh`, { headers: authHeaders() });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function reader({
    uid
}:{
    uid: string
}){
    const response = await fetch(`${API_URL}/read/${uid}`, { headers: authHeaders() });
    const data: IReadResponse = await response.json();
    if (!response.ok) throw new Error(data.message)
    return data.pages
}

export async function readerBookmarks({
    uid
}:{
    uid: string
}){
    const response = await fetch(`${API_URL}/read/${uid}/bookmarks`, { cache: 'no-store', headers: authHeaders() });
    const data: IBookmarksResponse = await response.json();
    if (!response.ok) throw new Error(data.message)
    return data.bookmarks
}

export async function deleteFile(
    fileUid: string
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/file`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ fileUid })
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function deleteFolder(
    folderUid: string
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/folder`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ folderUid })
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function createFolder(
    folderName: string,
    parentFolderUid?: string
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ folderName, parentFolderUid })
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function identifyLibraryEntry(
    uid: string
): Promise<Pick<ILibraryResponseItem, 'identified' | 'comic'>> {
    const response = await fetch(`${API_URL}/api/library/${uid}/identify`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function unidentifyFile(
    fileUid: string
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/file/unidentify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ fileUid })
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function commitIdentifyFile(
    fileUid: string,
    comic: WikiComic
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/file/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ fileUid, comic })
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function reidentifyAllLibrary(): Promise<{ error: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/library/identify/reset-all`, {
        method: 'POST',
        headers: authHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function startMetadataScan(): Promise<{ jobId: string; state: string }> {
    const response = await fetch(`${API_URL}/api/library/metadata/scan`, {
        method: 'POST',
        headers: authHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function pollMetadataScan(
    jobId: string,
    onProgress: (progress: ILibraryMetadataScanProgress) => void
): Promise<void> {

    return new Promise((resolve, reject) => {

        const poll = async () => {
            try {

                const res = await fetch(`${API_URL}/api/library/metadata/scan/${jobId}`, { headers: authHeaders() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);

                if (data.progress) onProgress(data.progress);

                if (data.state === 'done') {
                    resolve();
                } else if (data.state === 'error') {
                    reject(new Error('Library metadata scan failed.'));
                } else {
                    setTimeout(poll, POLL_INTERVAL_MS);
                }

            } catch (e) {
                reject(e instanceof Error ? e : new Error('Lost connection while scanning the library.'));
            }
        };

        poll();

    });

}

export async function getLibraryByMetadata(
    field: TLibraryMetadataField
): Promise<ILibraryMetadataGroup[]> {
    const params = new URLSearchParams({ field });
    const response = await fetch(`${API_URL}/api/library/metadata?${params}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data.groups;
}

export async function moveFile(
    fileUid: string,
    targetFolderUid?: string
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/file/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ fileUid, targetFolderUid })
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}
