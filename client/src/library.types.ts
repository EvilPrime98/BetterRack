export interface ILibraryItem {
    id: number;
    thumbnail: string;
    readPer: number;
    title: string;
    rating: number;
    issue: string;
    year: string;
}

export interface ILibraryResponseItem {
    "uid": string,
    "did": boolean,
    "name": string,
    "path": string,
    "parentId": string,
    "createdAt": string
}

export interface ILibraryGroup {
    "uid": string,
    "name": string,
    "path": string,
    "entries": ILibraryResponseItem[]
}

export interface IReadResponse {
    error: boolean;
    message: string;
    pages: string[];
}

export interface IComicLSCache {
    comicId: string;
    cover: string;
    rating: number;
}