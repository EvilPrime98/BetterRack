import { Hono } from "hono";
import type { fsModel, TPreferencesModel } from "#src/types.ts";
import { fileSystemController } from "#src/controllers/fsController.ts";

export function fsRouter(
    fsModel: fsModel,
    prefsModel: TPreferencesModel
) {
    const app = new Hono();
    app.get('/', (c) => fileSystemController(c, fsModel, prefsModel));
    return app;
}
