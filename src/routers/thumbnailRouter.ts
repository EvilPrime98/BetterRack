import { Hono } from "hono";
import { thumbnailController } from "#src/controllers/thumbnailController.ts";
import type { TLibraryModel, TThumbnailModel } from "#src/types.ts";

export function thumbnailRouter(thumbnailModel: TThumbnailModel, libModel: TLibraryModel) {
    const app = new Hono();
    const cc = new thumbnailController(thumbnailModel, libModel);
    app.get('/:uuid', async (c) => await cc.get(c));
    return app;
}
