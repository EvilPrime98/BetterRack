import type { IReadResponse, ILibraryGroup, ILibraryRefreshResponse } from "../library.types";

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