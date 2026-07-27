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
    scan: () => Promise<void>,
    get: (uid?: string) => TLibraryEntry[] | TLibraryEntry | undefined,
    getByLibrary: () => TLibraryGroup[],
    getPreferences: (uid: string) => TLibraryPref | undefined,
    updatePreferences: (uid: string, updates: Partial<Omit<TLibraryPref, 'uid'>>) => Promise<void>,
    refresh: () => Promise<void>,
    createFolder: (folderName: string, parentFolderUid: string) => Promise<void>,
    moveFile: (fileUid: string, targetFolderUid: string) => Promise<void>,
    deleteFolder: (folderUid: string) => Promise<void>,
    deleteFile: (fileUid: string) => Promise<void>
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
    get: (key: string) => any[];
    set: (key: string, value: any, ttlMs?: number) => void;
    delete: (key: string) => void;
}

export type CacheEntry = {
    value: any;
    expiresAt: number | null;
};

export const VALID_STRATS = {
    all: 'all',
    single: 'single',
    multiple: 'multiple'
}

export type TStrat = keyof typeof VALID_STRATS;