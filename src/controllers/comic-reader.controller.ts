import { statSync } from "node:fs";
import type { TLibraryEntry, TLibraryModel, TZipModel } from "#src/types.ts";
import type { Context } from "hono";
import { logger } from "#utils/logger";
import { buildStrongETag, ifNoneMatchSatisfied } from "#utils/http-cache";

const log = logger.child({ module: 'comicReaderController' });

export class comicReaderController {

    private libModel: TLibraryModel;
    private zipModel: TZipModel;

    constructor(
        libModel: TLibraryModel,
        zipModel: TZipModel
    ) {
        this.libModel = libModel;
        this.zipModel = zipModel;
    }

    private async getPages(
        uuid?: string
    ): Promise<{ pages: string[]; archivePath: string; title: string }> {

        const entry = this.libModel.get(uuid) as TLibraryEntry;

        if (!entry || !entry.path) {
            throw new Error('File not found in library');
        }

        const file = Bun.file(entry.path);
        if (!(await file.exists())) {
            throw new Error('File not found');
        }

        const pages = await this.zipModel.listPages({ filePath: entry.path });

        if (!pages.length) {
            throw new Error('No pages found in comic');
        }

        return { pages, archivePath: entry.path, title: entry.name };

    }

    public async get(
        c: Context
    ) {

        try {

            // The page list must reflect the archive's current contents on every reader mount
            c.header('Cache-Control', 'no-store');

            const uuid = c.req.param('uuid');
            const { pages, title } = await this.getPages(uuid);

            return c.json({
                error: false,
                message: 'Comic pages listed successfully',
                totalPages: pages.length,
                title,
                pages
            }, 200)

        }catch(e){

            log.error({ err: e }, 'Failed to list comic pages');

            return c.json({
                error: true,
                message: e instanceof Error ? e.message : 'There was an error reading the comic.',
                pages: []
            }, 500);

        }

    }

    public async getPage(
        c: Context
    ) {

        try {

            const uuid = c.req.param('uuid');
            const pageNumber = Number(c.req.param('page'));

            if (!Number.isInteger(pageNumber) || pageNumber < 1) {
                return c.json({
                    error: true,
                    message: 'Invalid page number'
                }, 400);
            }

            const { pages, archivePath } = await this.getPages(uuid);
            const pageEntry = pages[pageNumber - 1];

            if (!pageEntry) {
                return c.json({
                    error: true,
                    message: 'Page not found'
                }, 404);
            }

            // An archive page is immutable for a given (archive, entry). The ETag
            // uses the archive size and mtime, so a file replacement on disk
            // still changes it. `statSync` reads metadata only. It does not open
            // the archive.
            const archiveStat = statSync(archivePath);
            const etag = buildStrongETag(archivePath, pageEntry, archiveStat.size, archiveStat.mtimeMs);
            const cacheHeaders = {
                'Cache-Control': 'private, max-age=31536000, immutable',
                'ETag': etag,
            };

            if (ifNoneMatchSatisfied(c.req.header('if-none-match'), etag)) {
                return new Response(null, { status: 304, headers: cacheHeaders });
            }

            const stream = this.zipModel.getPageStream({
                filePath: archivePath,
                entryName: pageEntry
            });

            return new Response(stream, {
                headers: {
                    ...cacheHeaders,
                    'Content-Type': this.zipModel.getPageMimeType(pageEntry)
                }
            })

        }catch(e){

            log.error({ err: e }, 'Failed to get comic page');

            return c.json({
                error: true,
                message: e instanceof Error ? e.message : 'There was an error reading the comic.'
            }, 500);

        }

    }

    public async refresh(
        c: Context
    ) {

        try {

            c.header('Cache-Control', 'no-store');

            const uuid = c.req.param('uuid');
            const entry = this.libModel.get(uuid) as TLibraryEntry;

            if (!entry || !entry.path) {
                throw new Error('File not found in library');
            }

            this.zipModel.evictArchiveCache(entry.path);

            const { pages, title } = await this.getPages(uuid);

            return c.json({
                error: false,
                message: 'Comic re-scanned successfully',
                totalPages: pages.length,
                title,
                pages
            }, 200)

        }catch(e){

            log.error({ err: e }, 'Failed to refresh comic pages');

            return c.json({
                error: true,
                message: e instanceof Error ? e.message : 'There was an error reading the comic.',
                pages: []
            }, 500);

        }

    }

    public async getBookmarks(
        c: Context
    ) {

        try {

            c.header('Cache-Control', 'no-store');

            const uuid = c.req.param('uuid');
            const { archivePath } = await this.getPages(uuid);

            const bookmarks = await this.zipModel.extractBookmarks({ filePath: archivePath });

            return c.json({
                error: false,
                message: 'Comic bookmarks listed successfully',
                bookmarks
            }, 200);

        }catch(e){

            log.error({ err: e }, 'Failed to list comic bookmarks');

            return c.json({
                error: true,
                message: e instanceof Error ? e.message : 'There was an error reading the comic.',
                bookmarks: []
            }, 500);

        }

    }

}
