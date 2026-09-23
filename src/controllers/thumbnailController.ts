import type { TLibraryModel, TThumbnailModel } from "#src/types.ts";
import type { Context } from "hono";
import { logger } from "#utils/logger";
import { buildStrongETag, ifNoneMatchSatisfied } from "#utils/http-cache";

const log = logger.child({ module: 'thumbnailController' });

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

    private filePathFor(
        uuid: string
    ): string | undefined {
        const entry = this.libModel.get(uuid);
        return entry && !Array.isArray(entry) && !entry.did
        ? entry.path
        : undefined;
    }

    public async retry(
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

            const filePath = this.filePathFor(uuid);

            if (!filePath) {
                return c.json({
                    error: true,
                    message: 'No comic file found for this uid.'
                }, 404);
            }

            const thumbnailPath = await this.thumbnailModel.retry(uuid, filePath);

            if (!thumbnailPath) {
                return c.json({
                    error: true,
                    message: 'No thumbnail available for this comic.'
                }, 404);
            }

            return c.json({ ok: true });

        } catch (e) {

            log.error({ err: e }, 'Failed to retry thumbnail generation');

            return c.json({
                error: true,
                message: e instanceof Error ? e.message : 'There was an error generating the thumbnail.'
            }, 500);

        }

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

            const filePath = this.filePathFor(uuid);

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

            // A re-identify can regenerate the thumbnail at the same path. So the
            // ETag (path + size + mtime) pairs with a day-long max-age, not
            // `immutable`. The client revalidates and gets a 304 while the file
            // is unchanged.
            const etag = buildStrongETag(thumbnailPath, file.size, file.lastModified);
            const cacheHeaders = {
                'Cache-Control': 'private, max-age=86400',
                'ETag': etag,
            };

            if (ifNoneMatchSatisfied(c.req.header('if-none-match'), etag)) {
                return new Response(null, { status: 304, headers: cacheHeaders });
            }

            return new Response(file.stream(), {
                headers: {
                    ...cacheHeaders,
                    'Content-Type': file.type || 'application/octet-stream',
                    'Content-Length': String(file.size)
                }
            })

        } catch (e) {

            log.error({ err: e }, 'Failed to generate thumbnail');

            return c.json({
                error: true,
                message: e instanceof Error ? e.message : 'There was an error generating the thumbnail.'
            }, 500);

        }

    }

}
