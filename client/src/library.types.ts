import type { IUltraCompStateStateful } from "ultra-light-js";

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

export interface ILibraryFilters {
    sortByCreation: IUltraCompStateStateful<boolean>;
}

export interface IReadResponse {
    error: boolean;
    message: string;
    pages: string[];
}

export interface ILibraryRefreshResponse {
    error: boolean;
    message: string;
}

export interface IComicLSCache {
    comicId: string;
    /**Preference for the cover */
    cover: string;
    rating: number;
    readPer: number;
    /**Whether or not item has been *read* */
    read: boolean;
}

export const COMICS_TYPES = {
    'cover': 'cover',
    detail: 'detail'
} as const;

export const READ_TYPES = {
    'all': 'all',
    'read': 'read',
    'unread': 'unread',
    'reading': 'reading'
} as const;

export type TReadTypes = keyof typeof READ_TYPES;

export type TComicsTypes = keyof typeof COMICS_TYPES;

export const FILTER_OPTIONS = {
    nofilters: 'Alphabetically',
    byCreation: 'Creation Date'
} as const;

export type TFilterOptions = typeof FILTER_OPTIONS[keyof typeof FILTER_OPTIONS];

export function isIUltraCompStateStateful<T>(
    candidate: object
): candidate is IUltraCompStateStateful<T> {
    return Object.hasOwn(candidate, 'get')
    && Object.hasOwn(candidate, 'set')
    && Object.hasOwn(candidate, 'subscribe')
}