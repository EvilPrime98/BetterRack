import type { TLibraryEntry, TLibraryModel, TZipModel } from "#src/types.ts";
import type { Context } from "hono";
import { logger } from "#utils/logger";

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
    ): Promise<{ pages: string[]; archivePath: string }> {

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

        return { pages, archivePath: entry.path };

    }

    public async get(
        c: Context
    ) {

        try {

            const uuid = c.req.param('uuid');
            const { pages } = await this.getPages(uuid);

            return c.json({
                error: false,
                message: 'Comic pages listed successfully',
                totalPages: pages.length,
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

            const stream = this.zipModel.getPageStream({
                filePath: archivePath,
                entryName: pageEntry
            });

            return new Response(stream, {
                headers: {
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

}
