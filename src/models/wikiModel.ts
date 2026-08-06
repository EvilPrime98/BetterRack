import { wiki, type WikiComic } from "better-wiki";
import { WIKI_URLS, type TWikiModel, type TWikiUrl } from "#src/types.ts";

const DEFAULT_THUMBNAIL_SIZE = 120;

export class WikiModel implements TWikiModel {

    private clients: Record<TWikiUrl, ReturnType<typeof wiki<'dc-fandom'>>> = WIKI_URLS.reduce(
        (acc, url) => {
            acc[url] = wiki({ plugin: 'dc-fandom', url });
            return acc;
        },
        {} as Record<TWikiUrl, ReturnType<typeof wiki<'dc-fandom'>>>
    );

    getComic = async (
        title: string,
        thumbnailSize: number = DEFAULT_THUMBNAIL_SIZE
    ): Promise<WikiComic | null> => {

        const flags = {
            thumbnailSize,
            includeCollections: true,
        };

        const results = await Promise.all(
            Object.values(this.clients).map(client => {
                console.log(`[INFO] BETTERRACK - Searching wiki info for: ${title}`)
                return client.getComic(title, {
                    ...flags,
                    fields: [
                        'cover',
                        'credits',
                        'pageId',
                        'issue',
                        'title',
                        'volume',
                        'releaseDate'
                    ]
                })
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

        return await this.clients[sourceWiki]
            .getComicById(pageId, { thumbnailSize });

    }

    getComics = async (
        title: string,
        thumbnailSize: number = DEFAULT_THUMBNAIL_SIZE
    ): Promise<WikiComic[]> => {

        const flags = { multiple: true, thumbnailSize, includeCollections: true } as const;

        const results = await Promise.all(
            Object.values(this.clients).map(client => client.getComic(title, flags))
        );

        return results.flat();

    }

}
