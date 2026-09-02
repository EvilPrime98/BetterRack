import type { WikiComic } from "better-wiki";
import type { IReadResponse, IBookmarksResponse, ILibraryGroup, ILibraryPage, ILibraryRefreshResponse, ILibraryResponseItem } from "../library.types";
import { API_URL } from "./server-config.service";

export { API_URL };

// GET /api/library is paginated (ILibraryPage, not a bare group array). Walk every
// page and merge the slices back into one group list, because the store and
// getLibraryItems() expect the whole library in memory.
export async function getLibrary(): Promise<ILibraryGroup[]> {
    const merged = new Map<string, ILibraryGroup>();
    let offset = 0;

    for (;;) {
        const response = await fetch(`${API_URL}/api/library?offset=${offset}`);
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

export async function refreshLibrary(): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/refresh`);
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function reader({
    uid
}:{
    uid: string
}){
    const response = await fetch(`${API_URL}/read/${uid}`);
    const data: IReadResponse = await response.json();
    if (!response.ok) throw new Error(data.message)
    return data.pages
}

export async function readerBookmarks({
    uid
}:{
    uid: string
}){
    const response = await fetch(`${API_URL}/read/${uid}/bookmarks`, { cache: 'no-store' });
    const data: IBookmarksResponse = await response.json();
    if (!response.ok) throw new Error(data.message)
    return data.bookmarks
}

export async function deleteFile(
    fileUid: string
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/file`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, parentFolderUid })
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function identifyLibraryEntry(
    uid: string
): Promise<Pick<ILibraryResponseItem, 'identified' | 'comic'>> {
    const response = await fetch(`${API_URL}/api/library/${uid}/identify`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function unidentifyFile(
    fileUid: string
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/file/unidentify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUid, comic })
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function moveFile(
    fileUid: string,
    targetFolderUid?: string
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/file/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUid, targetFolderUid })
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}
