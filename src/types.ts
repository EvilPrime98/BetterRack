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
    downloadLink: string | null;
}

export type TDownloadableObject = {
    uuid: string;
    title: string;
}


export type TGetComicsApiModel = {
    getPostLinks: (params: { search: string; page?: number | number[]; perPage?: number }) => Promise<TPostLink[]>,
    getDownloadLinkFromPost: (postId: number, strat: TStrat, uuid?: string) => Promise<string | null>,
    //getDownloadLinksFromPosts: (postLinks: TPostLink[], limit?: number) => Promise<TDownloadLink[]>,
    getWeeklyListPosts: (group?: string) => Promise<TPostLink[]>,
    getDownloadLinks: (postId: number, strat: TStrat) => Promise<TDownloadableObject[]>,
    getCoverFromPost: (postId: number) => Promise<string | null>,
    getLatest: (params?: { page?: number; perPage?: number }) => Promise<TPostLink[]>,
}

export type TProgressEvent =
    | { type: 'preparing'; title: string }
    | { type: 'retrying'; title: string; status?: number; reason?: 'network' | 'http'; delaySec: number }
    | { type: 'progress'; title: string; percent: number; receivedMB: string; totalMB: string }
    | { type: 'extracting'; title: string; done: number; total: number }
    | { type: 'done'; filename: string }
    | { type: 'error'; message: string }

export type TIdentifyProgress =
    | { type: 'identifying'; done: number; total: number }
    | { type: 'done'; total: number }
    | { type: 'error'; message: string }

export type TDownloadModel = {
    downloadComic: ({
        link,
        rowIndex,
        totalRows,
        noRetry,
        outputDir,
        onProgress,
        signal
    }: {
        link: TDownloadLink,
        rowIndex?: number,
        totalRows?: number,
        noRetry?: boolean,
        outputDir: string,
        onProgress?: (event: TProgressEvent) => void,
        signal?: AbortSignal
    }) => Promise<string | undefined>
    downloadComicBundle: ({
        postLinks,
        noRetry,
        outputDir
    }: {
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
    metaSource?: TMetaSource;
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

export type TLibraryIndexGroup = {
    uid: string;
    name: string;
    count: number;
}

export type TLibraryPage = {
    groups: TLibraryGroup[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export type TRecentlyAddedResponse = {
    /** File entries added within the window, newest first. Folders are never included. */
    items: TLibraryEntry[];
    /** The look-back window this result was built with, in hours. */
    windowHours: number;
    /** The `Date.now()` value the window was measured against. */
    generatedAt: number;
}

export type TReadingResponse = {
    items: TLibraryEntry[];
    generatedAt: number;
}

export type TLibraryModel = {
    /** Resolves once the filesystem scan has completed. Wiki identification is on demand and never blocks this. */
    ready: Promise<void>,
    scan: () => Promise<void>,
    get: (uid?: string) => TLibraryEntry[] | TLibraryEntry | undefined,
    getByLibrary: () => TLibraryGroup[],
    /** Per-library index (uid, name, entry count) with no entry payloads. The sidebar tree can render before the entries load. */
    getLibraryIndex: () => TLibraryIndexGroup[],
    /** A slice of the flat entry list in group order, re-nested into its groups, with pagination metadata. `limit` and `offset` count entries, not groups. */
    getLibraryPage: (options?: { limit?: number; offset?: number }) => TLibraryPage,
    /** A flat list of file entries, newest first, whose `createdAt` is inside the look-back window. `windowHours` defaults to 24. */
    getRecentlyAdded: (options?: { windowHours?: number; nowMs?: number }) => TRecentlyAddedResponse,
    getReading: () => TReadingResponse,
    getPreferences: (uid: string) => TLibraryPref | undefined,
    updatePreferences: (uid: string, updates: Partial<Omit<TLibraryPref, 'uid'>>) => Promise<void>,
    refresh: () => Promise<void>,
    createFolder: (folderName: string, parentFolderUid: string) => Promise<void>,
    moveFile: (fileUid: string, targetFolderUid: string) => Promise<void>,
    deleteFolder: (folderUid: string) => Promise<void>,
    deleteFile: (fileUid: string) => Promise<void>,
    unidentifyFile: (fileUid: string) => Promise<void>,
    /** Writes a manual identify pick to the comic-data store and the in-memory entry. This makes `getByLibrary()` show the pick without a rescan. */
    commitIdentify: (fileUid: string, comic: WikiComic) => Promise<void>,
    /** Resolves wiki metadata for a single comic on demand; cached results skip the wiki call. */
    identify: (uid: string) => Promise<TLibraryEntry>,
    identifyLibrary: (onProgress?: (done: number, total: number) => void) => Promise<void>,
    /** Clears a single entry's stored identification and immediately re-runs `identify()`, forcing a fresh lookup even if it was already identified. */
    reidentifyFile: (uid: string) => Promise<TLibraryEntry>,
    reidentifyAll: () => Promise<void>,
    addLibraryPath: (dir: string) => Promise<void>,
    removeLibraryPath: (dir: string) => Promise<void>,
    getLibraryPaths: () => string[],
}

export type TAppSettings = {
    outputDirs: string[];
    apiUrl: string;
    downloadDir: string;
    identifyFromMeta: boolean;
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

export type TMetaSource = 'wiki' | 'comicinfo';

export type TComicData = {
    uid: string;
    prefId?: number;
    sourceWiki?: string;
    metaSource?: TMetaSource;
    /** Tri-state: undefined = never attempted, true = matched, false = searched and found nothing. */
    identified?: boolean;
    /** Full wiki payload cached once identified, so the front never has to re-fetch it. */
    comic?: WikiComic;
    cover?: string;
    rating?: number;
    currentPage?: number;
    readPer?: number;
    read?: boolean;
    lastReadAt?: number;
}

export type TComicDataModel = {
    getAll: () => Record<string, TComicData>,
    getByUid: (uid: string) => TComicData | undefined,
    upsert: (uid: string, partial: Partial<Omit<TComicData, 'uid'>>) => TComicData,
    resetIdentification: () => void
}

export type TThumbnailModel = {
    /**
     * Returns the cached fallback thumbnail path for a comic, if one exists.
     * When `filePath` is provided and no cached thumbnail exists yet, extracts the archive's
     * first image page and caches it. Returns null if unavailable/ungeneratable.
     */
    getThumbnail: (uid: string, filePath?: string) => Promise<string | null>,
    retry: (uid: string, filePath: string) => Promise<string | null>,
}

export type TComicInfoModel = {
    /**
     * Parses a raw ComicInfo.xml string into a normalized shape.
     */
    parse: (xml: string) => IComicInfoXML | null;
}

export type TZipModel = {
    listPages: ({ filePath }: {
        filePath: string;
    }) => Promise<string[]>,
    evictArchiveCache: (filePath: string) => void,
    getPageStream: ({ filePath, entryName }: {
        filePath: string;
        entryName: string;
    }) => ReadableStream<Uint8Array>,
    extractPage: ({ filePath, outDir, entryName }: {
        filePath: string;
        outDir: string;
        entryName: string;
    }) => Promise<void>,
    extractComicInfo: ({ filePath }: {
        filePath: string;
    }) => Promise<IComicInfoXML|null>,
    extractBookmarks: ({ filePath }: {
        filePath: string;
    }) => Promise<TComicBookmark[]>,
    getPageMimeType: (entryName: string) => string
}

export type TComicBookmark = {
    /** The 1-based index into the reader's page list. Use it directly in GET /read/:uuid/pages/:page. */
    page: number;
    label: string;
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
    getDirectoriesUnder: (roots: string[]) => Promise<string[]>;
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

export type TYesNo = 'Unknown' | 'No' | 'Yes';

export type TMangaYesNo = 'Unknown' | 'No' | 'Yes' | 'YesAndRightToLeft';

export type TComicPageType =
    | 'FrontCover' | 'InnerCover' | 'Roundup' | 'Story' | 'Advertisement'
    | 'Editorial' | 'Letters' | 'Preview' | 'BackCover' | 'Other' | 'Deleted';

export type TImageRotation = 'None' | 'Rotate90' | 'Rotate180' | 'Rotate270';

export type TComicPagePosition = 'Default' | 'Near' | 'Far';

export interface IComicInfoPage {
    "@_Image": string;
    "@_Type"?: TComicPageType;
    "@_ImageSize"?: string;
    "@_ImageWidth"?: string;
    "@_ImageHeight"?: string;
    "@_Bookmark"?: string;
    "@_Key"?: string;
    "@_Rotation"?: TImageRotation;
    "@_PagePosition"?: TComicPagePosition;
}

export interface IComicInfoXML {

    '?xml'?: {
        '@_version': string;
    };

    ComicInfo: {
        Title?: string;
        Series?: string;
        Number?: string;
        Count?: number;
        Volume?: number;
        AlternateSeries?: string;
        AlternateNumber?: string;
        /** Multi-value, comma/semicolon-separated. */
        StoryArc?: string;
        /** Multi-value, comma/semicolon-separated. */
        SeriesGroup?: string;
        AlternateCount?: number;
        Summary?: string;
        Notes?: string;
        Review?: string;
        Year?: number;
        Month?: number;
        Day?: number;
        /** Multi-value, comma/semicolon-separated. */
        Writer?: string;
        /** Multi-value, comma/semicolon-separated. */
        Penciller?: string;
        /** Multi-value, comma/semicolon-separated. */
        Inker?: string;
        /** Multi-value, comma/semicolon-separated. */
        Colorist?: string;
        /** Multi-value, comma/semicolon-separated. */
        Letterer?: string;
        /** Multi-value, comma/semicolon-separated. */
        CoverArtist?: string;
        /** Multi-value, comma/semicolon-separated. */
        Editor?: string;
        /** Multi-value, comma/semicolon-separated. */
        Translator?: string;
        Publisher?: string;
        Imprint?: string;
        /** Multi-value, comma/semicolon-separated. */
        Genre?: string;
        Web?: string;
        /** Advisory only */
        PageCount?: number;
        LanguageISO?: string;
        /** Free-form string, not an enum. */
        Format?: string;
        /** Free-form string, not a constrained enum*/
        AgeRating?: string;
        BlackAndWhite?: TYesNo;
        Manga?: TMangaYesNo;
        PreferredFrontCover?: number;
        /** Multi-value, comma/semicolon-separated. */
        Characters?: string;
        /** Multi-value, comma/semicolon-separated. */
        Teams?: string;
        MainCharacterOrTeam?: string;
        /** Multi-value, comma/semicolon-separated. */
        Locations?: string;
        /** Clamped to [0, 5] on write, read as-is. */
        CommunityRating?: number;
        ScanInformation?: string;
        /** Multi-value, comma/semicolon-separated. */
        Tags?: string;
        Pages?: {
            Page?: IComicInfoPage | IComicInfoPage[];
        };
        '@_xmlns:xsd'?: string;
        '@_xmlns:xsi'?: string;
    };

}