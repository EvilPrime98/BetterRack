import { wiki, type WikiComic } from "better-wiki";
import { WIKI_URLS, type TWikiModel, type TWikiUrl } from "#src/types.ts";
import { logger } from "#utils/logger";

const log = logger.child({ module: 'WikiModel' });

const DEFAULT_THUMBNAIL_SIZE = 120;

const MARVEL_WIKI_URL: TWikiUrl = 'https://marvel.fandom.com';

const COMIC_FIELDS: (keyof WikiComic)[] = [
    'cover',
    'credits',
    'pageId',
    'issue',
    'title',
    'volume',
    'releaseDate',
    'sourceWiki'
];

type TWikiComicClient = {
    findComic: (title: string, thumbnailSize: number) => Promise<WikiComic | null>;
    findComics: (title: string, thumbnailSize: number) => Promise<WikiComic[]>;
    findComicById: (pageId: number, thumbnailSize: number) => Promise<WikiComic | null>;
};

const createMarvelClient = (url: TWikiUrl): TWikiComicClient => {
    const client = wiki({ plugin: 'marvel-fandom', url });
    return {
        findComic: (title, thumbnailSize) => client.getComic(title, { thumbnailSize, includeCollections: true }),
        findComics: (title, thumbnailSize) => client.getComic(title, { multiple: true, thumbnailSize, includeCollections: true }),
        findComicById: (pageId, thumbnailSize) => client.getComicById(pageId, { thumbnailSize }),
    };
};

const createDcClient = (url: TWikiUrl): TWikiComicClient => {
    const client = wiki({ plugin: 'dc-fandom', url });
    return {
        findComic: (title, thumbnailSize) => client.getComic(title, { thumbnailSize, includeCollections: true, fields: COMIC_FIELDS }),
        findComics: (title, thumbnailSize) => client.getComic(title, { multiple: true, thumbnailSize, includeCollections: true }),
        findComicById: (pageId, thumbnailSize) => client.getComicById(pageId, { thumbnailSize }),
    };
};

const createClient = (url: TWikiUrl): TWikiComicClient =>
    url === MARVEL_WIKI_URL ? createMarvelClient(url) : createDcClient(url);

export class WikiModel implements TWikiModel {

    private clients: Record<TWikiUrl, TWikiComicClient> = WIKI_URLS.reduce(
        (acc, url) => {
            acc[url] = createClient(url);
            return acc;
        },
        {} as Record<TWikiUrl, TWikiComicClient>
    );

    getComic = async (
        title: string,
        thumbnailSize: number = DEFAULT_THUMBNAIL_SIZE
    ): Promise<WikiComic | null> => {

        const results = await Promise.all(
            Object.values(this.clients).map(client => {
                log.info(`Searching wiki info for: ${title}`)
                return client.findComic(title, thumbnailSize)
            })
        );

        for (const result of results) if (result) return result;
        return null;

    }

    getComicById = async (
        pageId: number,
        sourceWiki: TWikiUrl,
        thumbnailSize: number = DEFAULT_THUMBNAIL_SIZE
    ): Promise<WikiComic | null> => {

        return await this.clients[sourceWiki].findComicById(pageId, thumbnailSize);

    }

    getComics = async (
        title: string,
        thumbnailSize: number = DEFAULT_THUMBNAIL_SIZE
    ): Promise<WikiComic[]> => {

        const results = await Promise.all(
            Object.values(this.clients).map(client => client.findComics(title, thumbnailSize))
        );

        return results.flat();

    }

}
