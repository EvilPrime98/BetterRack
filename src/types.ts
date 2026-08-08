import type { WikiComic } from "better-wiki";

export type TPostLink = {
    id?: number;
    thumbnailUrl?: string;
    title: string;
    link: string;
    uploadDate?: string;
}

export type TDownloadLink = {
    title: string;
    downloadLink: string|null;
}

export type TDownloadableObject = {
    uuid: string;
    title: string;
}


export type TGetComicsApiModel = {
    getPostLinks: (params: { search: string; page?: number|number[]; perPage?: number }) => Promise<TPostLink[]>,
    getDownloadLinkFromPost: (postId: number, strat: TStrat, uuid?: string) => Promise<string | null>,
    //getDownloadLinksFromPosts: (postLinks: TPostLink[], limit?: number) => Promise<TDownloadLink[]>,
    getWeeklyListPosts: (group?: string) => Promise<TPostLink[]>,
    getDownloadLinks: (postId: number, strat: TStrat) => Promise<TDownloadableObject[]>,
    getCoverFromPost: (postId: number) => Promise<string | null>,
    getLatest: (params?: { page?: number; perPage?: number }) => Promise<TPostLink[]>,
}

export type TProgressEvent =
    | { type: 'preparing'; title: string }
    | { type: 'retrying'; title: string; status: number; delaySec: number }
    | { type: 'progress'; title: string; percent: number; receivedMB: string; totalMB: string }
    | { type: 'done'; filename: string }
    | { type: 'error'; message: string }

export type TDownloadModel = {
    downloadComic: ({
        link,
        rowIndex,
        totalRows,
        noRetry,
        outputDir,
        onProgress
    }:{
        link: TDownloadLink,
        rowIndex?: number,
        totalRows?: number,
        noRetry?: boolean,
        outputDir: string,
        onProgress?: (event: TProgressEvent) => void
    }) => Promise<string | undefined>
    downloadComicBundle: ({
        postLinks,
        noRetry,
        outputDir
    }:{
        postLinks: TDownloadLink[],
        noRetry?: boolean,
        outputDir: string
    }) => Promise<void>
}

export type TLibraryEntry = {
    uid: string;
    did: boolean;
    name: string;
    path: string;
    parentId?: string;
    createdAt?: number;
    prefPublisher?: string;
    prefInheritance?: boolean;
    prefCover?: string;
    /** Tri-state, files only: undefined = not yet looked up (call `identify()`), true = identified (see `comic`), false = looked up, no wiki match. */
    identified?: boolean;
    /** The identified wiki comic, resolved on demand via LibraryModel.identify() - never populated by scan(). */
    comic?: WikiComic;
}

export type TLibraryPref = {
    uid: string;
    prefPublisher: string;
    recursive: boolean;
    prefCover: string;
}

export type TLibraryGroup = {
    uid: string;
    name: string;
    path: string;
    entries: TLibraryEntry[];
}

export type TLibraryModel = {
    /** Resolves once the filesystem scan has completed. Wiki identification is on demand and never blocks this. */
    ready: Promise<void>,
    scan: () => Promise<void>,
    get: (uid?: string) => TLibraryEntry[] | TLibraryEntry | undefined,
    getByLibrary: () => TLibraryGroup[],
    getPreferences: (uid: string) => TLibraryPref | undefined,
    updatePreferences: (uid: string, updates: Partial<Omit<TLibraryPref, 'uid'>>) => Promise<void>,
    refresh: () => Promise<void>,
    createFolder: (folderName: string, parentFolderUid: string) => Promise<void>,
    moveFile: (fileUid: string, targetFolderUid: string) => Promise<void>,
    deleteFolder: (folderUid: string) => Promise<void>,
    deleteFile: (fileUid: string) => Promise<void>,
    unidentifyFile: (fileUid: string) => Promise<void>,
    /** Resolves wiki metadata for a single comic on demand; cached results skip the wiki call. */
    identify: (uid: string) => Promise<TLibraryEntry>,
    addLibraryPath: (dir: string) => Promise<void>,
    removeLibraryPath: (dir: string) => Promise<void>,
    getLibraryPaths: () => string[],
}

export type TAppSettings = {
    outputDirs: string[];
    apiUrl: string;
    baseUrl: string;
    hostDomain: string;
    downloadDir: string;
}

export type TPreferencesModel = {
    getAppSettings: () => TAppSettings,
    updateAppSettings: (partial: Partial<TAppSettings>) => TAppSettings,
    getLibraryPref: (uid: string) => TLibraryPref | undefined,
    getAllLibraryPrefs: () => TLibraryPref[],
    upsertLibraryPref: (uid: string, partial: Partial<Omit<TLibraryPref, 'uid'>>) => TLibraryPref,
}

export const WIKI_URLS = [
    'https://dc.fandom.com',
    'https://marvel.fandom.com',
    'https://imagecomics.fandom.com',
    'https://darkhorse.fandom.com',
    'https://dynamiteentertainment.fandom.com'
] as const;

export type TWikiUrl = typeof WIKI_URLS[number];

export type TWikiModel = {
    getComic: (title: string, thumbnailSize?: number) => Promise<WikiComic | null>,
    getComicById: (pageId: number, sourceWiki: TWikiUrl, thumbnailSize?: number) => Promise<WikiComic | null>,
    getComics: (title: string, thumbnailSize?: number) => Promise<WikiComic[]>
}

export type TComicData = {
    uid: string;
    prefId?: number;
    sourceWiki?: string;
    /** Tri-state: undefined = never attempted, true = matched, false = searched and found nothing. */
    identified?: boolean;
    /** Full wiki payload cached once identified, so the front never has to re-fetch it. */
    comic?: WikiComic;
    cover?: string;
    rating?: number;
    currentPage?: number;
    readPer?: number;
    read?: boolean;
}

export type TComicDataModel = {
    getAll: () => Record<string, TComicData>,
    getByUid: (uid: string) => TComicData | undefined,
    upsert: (uid: string, partial: Partial<Omit<TComicData, 'uid'>>) => TComicData
}

export type TThumbnailModel = {
    /**
     * Returns the cached fallback thumbnail path for a comic, if one exists.
     * When `filePath` is provided and no cached thumbnail exists yet, extracts the archive's
     * first image page and caches it. Returns null if unavailable/ungeneratable.
     */
    getThumbnail: (uid: string, filePath?: string) => Promise<string | null>,
}

export type TZipModel = {
    listPages: ({ filePath }: {
        filePath: string;
    }) => Promise<string[]>,
    extractPage: ({ filePath, outDir, entryName }: {
        filePath: string;
        outDir: string;
        entryName: string;
    }) => Promise<void>,
    touchAccess: ({ outDir }: {
        outDir: string;
    }) => Promise<void>,
    sweepStale: ({ baseDir, ttlMs }: {
        baseDir: string;
        ttlMs: number;
    }) => Promise<void>
}

export type WPPost = {
    id: number;
    title: { rendered: string };
    link: string;
    jetpack_featured_media_url: string;
    content: { rendered: string };
    date?: string;
};

export type TGCWOptionFactory = {
    short: string,
    long: string,
    argument?: string,
    description: string,
    default?: string,
}

export type TGCWArgumentFactory = {
    value: string,
    description: string,
}

export type fsModel = {
    getListofDirectories: () => Promise<string[]>;
    getFullPath: (dir: string) => Promise<string>;
}

export type TCacheModel = {
    get: <T>(key: string) => T[];
    set: <T>(key: string, value: T, ttlMs?: number) => void;
    delete: (key: string) => void;
}

export type CacheEntry = {
    value: unknown;
    expiresAt: number | null;
};

export const VALID_STRATS = {
    all: 'all',
    single: 'single',
    multiple: 'multiple'
}

export type TStrat = keyof typeof VALID_STRATS;