import type { TLibraryEntry, TLibraryModel } from "#src/types.ts";
import type { Context } from "hono";
import { basename } from "node:path";
import { logger } from "#utils/logger";

const log = logger.child({ module: 'streamController' });

export class streamController {

    private libModel: TLibraryModel;

    constructor(
        libModel: TLibraryModel
    ) {
        this.libModel = libModel;
    }

    public async get(
        c: Context
    ) {
        
        try {

            const uuid = c.req.param('uuid');
            const entry = this.libModel.get(uuid) as TLibraryEntry;

            if (!entry || !entry.path) {
                throw new Error('File not found in library');
            }

            const file = Bun.file(entry.path);
            if (!(await file.exists())) {
                throw new Error('File not found');
            }

            return new Response(file.stream(), {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${basename(file.name!)}"`,
                    'Content-Length': String(file.size),
                },
            })

        }catch(e){

            log.error({ err: e }, 'Failed to stream comic file');

            return c.json(
                {
                    error: e instanceof Error ? e.message : 'There was an error downloading the comic.'
                },
                500
            );

        }

    }

}