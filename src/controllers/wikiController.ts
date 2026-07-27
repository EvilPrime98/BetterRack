import { WIKI_URLS, type TWikiModel, type TWikiUrl } from "#src/types.ts";
import type { Context } from "hono";

export class wikiController {

    private wikiModel: TWikiModel;

    constructor(
        wikiModel: TWikiModel
    ) {
        this.wikiModel = wikiModel;
    }

    public async getComic(
        c: Context
    ) {
        const title = c.req.query('title');
        if (!title) return c.json({ error: true, message: 'A comic title is required.' }, 400);

        const thumbnailSize = c.req.query('thumbnailSize');
        const comic = await this.wikiModel.getComic(title, thumbnailSize ? Number(thumbnailSize) : undefined);

        return c.json(comic, 200);
    }

    public async getComicById(
        c: Context
    ) {
        const pageId = Number(c.req.param('id'));
        if (!pageId) return c.json({ error: true, message: 'A valid page id is required.' }, 400);

        const sourceWiki = c.req.query('sourceWiki');
        if (!sourceWiki || !(WIKI_URLS as readonly string[]).includes(sourceWiki)) {
            return c.json({ error: true, message: 'A valid sourceWiki is required.' }, 400);
        }

        const thumbnailSize = c.req.query('thumbnailSize');
        const comic = await this.wikiModel.getComicById(
            pageId,
            sourceWiki as TWikiUrl,
            thumbnailSize ? Number(thumbnailSize) : undefined
        );

        return c.json(comic, 200);
    }

    public async getComics(
        c: Context
    ) {
        const title = c.req.query('title');
        if (!title) return c.json({ error: true, message: 'A comic title is required.' }, 400);

        const thumbnailSize = c.req.query('thumbnailSize');
        const comics = await this.wikiModel.getComics(title, thumbnailSize ? Number(thumbnailSize) : undefined);

        return c.json(comics, 200);
    }

}
