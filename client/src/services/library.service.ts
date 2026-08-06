import type { IReadResponse, ILibraryGroup, ILibraryRefreshResponse, ILibraryItemPref } from "../library.types";

export const API_URL = import.meta.env.VITE_API_URL;

export async function getLibrary(): Promise<ILibraryGroup[]> {
    const response = await fetch(`${API_URL}/api/library`)
    const data = await response.json();
    return data
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

export async function getLibraryPref(
    uid: string
): Promise<ILibraryItemPref | null> {
    const response = await fetch(`${API_URL}/api/library/preferences/${uid}`);
    if (response.status === 404) return null;
    const data = await response.json() as ILibraryItemPref;
    return data;
}

export async function updateLibraryPref(
    uid: string,
    updates: Partial<{ prefPublisher: string; recursive: boolean; prefCover: string }>
): Promise<ILibraryRefreshResponse> {
    const response = await fetch(`${API_URL}/api/library/preferences/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    const data: ILibraryRefreshResponse = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
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