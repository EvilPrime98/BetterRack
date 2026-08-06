import type { TLibraryModel, TThumbnailModel } from "#src/types.ts";
import type { Context } from "hono";

export class thumbnailController {

    private thumbnailModel: TThumbnailModel;
    private libModel: TLibraryModel;

    constructor(
        thumbnailModel: TThumbnailModel,
        libModel: TLibraryModel
    ) {
        this.thumbnailModel = thumbnailModel;
        this.libModel = libModel;
    }

    public async get(
        c: Context
    ) {

        try {

            const uuid = c.req.param('uuid');

            if (!uuid) {
                return c.json({
                    error: true,
                    message: 'A valid uid is required.'
                }, 400);
            }

            const entry = this.libModel.get(uuid);
            const filePath = entry && !Array.isArray(entry) && !entry.did
            ? entry.path
            : undefined;
            
            const thumbnailPath = await this.thumbnailModel.getThumbnail(uuid, filePath);

            if (!thumbnailPath) {
                return c.json({
                    error: true,
                    message: 'No thumbnail available for this comic.'
                }, 404);
            }

            const file = Bun.file(thumbnailPath);
            if (!(await file.exists())) {
                return c.json({
                    error: true,
                    message: 'No thumbnail available for this comic.'
                }, 404);
            }

            return new Response(file.stream(), {
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                    'Content-Length': String(file.size),
                    'Cache-Control': 'private, max-age=86400'
                }
            })

        } catch (e) {

            console.log(e);

            return c.json({
                error: true,
                message: e instanceof Error ? e.message : 'There was an error generating the thumbnail.'
            }, 500);

        }

    }

}
