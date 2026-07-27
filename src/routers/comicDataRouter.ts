import { Hono } from "hono";
import type { TComicDataModel } from "#src/types.ts";
import { comicDataController } from "#src/controllers/comicDataController.ts";

export function comicDataRouter(
    comicDataModel: TComicDataModel
){
    const app = new Hono();
    const cc = new comicDataController(comicDataModel);
    app.get('/', (c) => cc.getAll(c));
    app.patch('/:uid', (c) => cc.update(c));
    return app;
}
