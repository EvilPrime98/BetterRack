import { Hono } from "hono";
import type { TWikiModel } from "#src/types.ts";
import { wikiController } from "#src/controllers/wikiController.ts";

export function wikiRouter(
    wikiModel: TWikiModel
){
    const app = new Hono();
    const cc = new wikiController(wikiModel);
    app.get('/comic', (c) => cc.getComic(c));
    app.get('/comic/:id', (c) => cc.getComicById(c));
    app.get('/comics', (c) => cc.getComics(c));
    return app;
}
