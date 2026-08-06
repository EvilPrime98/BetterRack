import type { TLibraryEntry, TLibraryModel, TZipModel } from "#src/types.ts";
import type { Context } from "hono";
import { existsSync } from "node:fs";
import path from "node:path";

export const COMIC_TMP_DIR = path.resolve('./tmp-decompressor');

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
    ): Promise<{ outDir: string; pages: string[]; archivePath: string }> {

        const entry = this.libModel.get(uuid) as TLibraryEntry;

        if (!entry || !entry.path) {
            throw new Error('File not found in library');
        }

        const file = Bun.file(entry.path);
        if (!(await file.exists())) {
            throw new Error('File not found');
        }

        const outDir = path.join(COMIC_TMP_DIR, entry.name);
        const pages = await this.zipModel.listPages({ filePath: entry.path });

        if (!pages.length) {
            throw new Error('No pages found in comic');
        }

        await this.zipModel.touchAccess({ outDir });

        return { outDir, pages, archivePath: entry.path };

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

            console.log(e);

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

            const { outDir, pages, archivePath } = await this.getPages(uuid);
            const pageEntry = pages[pageNumber - 1];

            if (!pageEntry) {
                return c.json({
                    error: true,
                    message: 'Page not found'
                }, 404);
            }

            const pagePath = path.join(outDir, pageEntry);

            if (!existsSync(pagePath)) {
                await this.zipModel.extractPage({
                    filePath: archivePath,
                    outDir,
                    entryName: pageEntry
                });
            }

            const file = Bun.file(pagePath);

            return new Response(file.stream(), {
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                    'Content-Length': String(file.size)
                }
            })

        }catch(e){

            console.log(e);

            return c.json({
                error: true,
                message: e instanceof Error ? e.message : 'There was an error reading the comic.'
            }, 500);

        }

    }

}
