import type { WikiComic } from "better-wiki";

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
    /** Milliseconds since the epoch, from the file's mtime at scan time. */
    "createdAt": number,
    /** Tri-state, files only: undefined = not yet looked up (fetch GET /api/library/:uid/identify), true = identified (see `comic`), false = looked up, no wiki match. */
    "identified"?: boolean,
    /** The identified wiki comic, resolved on demand - metadata only, never the cover source. */
    "comic"?: WikiComic,
}

export interface ILibraryGroup {
    "uid": string,
    "name": string,
    "path": string,
    "entries": ILibraryResponseItem[]
}

/** The response body of GET /api/library/recent. It is a flat list of files added within the window, newest first. */
export interface IRecentlyAddedResponse {
    items: ILibraryResponseItem[];
    /** The look-back window the list was built with, in hours. */
    windowHours: number;
    /** The `Date.now()` value the window was measured against. */
    generatedAt: number;
}

/** Filter toggles for the library grid; owned by the `useFilters` hook (react/src/hooks/useFilters.ts). */
export interface ILibraryFilters {
    sortByCreation: boolean;
    sortByReleaseDate: boolean;
}

export interface IReadResponse {
    error: boolean;
    message: string;
    pages: string[];
}

export interface IBookmark {
    /** The 1-based page index. Use it directly in GET /read/:uid/pages/:page. */
    page: number;
    label: string;
}

export interface IBookmarksResponse {
    error: boolean;
    message: string;
    bookmarks: IBookmark[];
}

export interface ILibraryRefreshResponse {
    error: boolean;
    message: string;
}

export interface IComicLSCache {
    /**Rating for the comic */
    rating: number;
    /**Current page reading */
    currentPage: number;
    /**Current % of read */
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

export const COMIC_FILTERS = {
    writer: 'writer'
} as const;

export type TComicFilters = keyof typeof COMIC_FILTERS;

export type IComicFilters = Partial<Record<TComicFilters, string>>;

export const FILTER_OPTIONS = {
    nofilters: 'Alphabetically',
    byCreation: 'Creation Date',
    byReleaseDate: 'Release Date'
} as const;

export type TFilterOptions = typeof FILTER_OPTIONS[keyof typeof FILTER_OPTIONS];
