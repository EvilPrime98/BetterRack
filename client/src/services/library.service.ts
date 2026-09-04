import type { IReadResponse, IBookmarksResponse, ILibraryIndexGroup, ILibraryPage, ILibraryRefreshResponse, ILibraryResponseItem, IRecentlyAddedResponse } from "../library.types";
import { API_URL } from "./server-config.service";

export { API_URL };

/** The default entries-per-page for the incremental library load. It matches the server default. */
export const LIBRARY_PAGE_SIZE = 100;

export async function getRecentlyAdded(windowHours?: number): Promise<IRecentlyAddedResponse> {
    const query = typeof windowHours === 'number' && windowHours > 0
        ? `?${new URLSearchParams({ windowHours: String(windowHours) })}`
        : '';
    const response = await fetch(`${API_URL}/api/library/recent${query}`);
    const data = await response.json();
    if (!response.ok) throw new Error((data as { message?: string })?.message || 'Failed to load recently added comics.');
    return data as IRecentlyAddedResponse;
}

export async function getLibraryIndex(): Promise<ILibraryIndexGroup[]> {
    const response = await fetch(`${API_URL}/api/library/index`);
    const data = await response.json();
    if (!response.ok) throw new Error((data as { message?: string })?.message || 'Failed to load library index.');
    return data as ILibraryIndexGroup[];
}

export async function getLibraryPage({
    limit = LIBRARY_PAGE_SIZE,
    offset = 0
}: {
    limit?: number;
    offset?: number;
} = {}): Promise<ILibraryPage> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const response = await fetch(`${API_URL}/api/library?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error((data as { message?: string })?.message || 'Failed to load library.');
    return data as ILibraryPage;
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
    const response = await fetch(`${API_URL}/read/${uid}`, { cache: 'no-store' });
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