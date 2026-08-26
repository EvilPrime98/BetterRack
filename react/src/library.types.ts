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
    "createdAt": string,
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

/** Persisted alongside IComicLSCache in comic_data, but manages identity rather than reading progress. */
export interface IComicIdentity {
    prefId?: number;
    sourceWiki?: string;
    identified?: boolean;
    comic?: WikiComic;
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
