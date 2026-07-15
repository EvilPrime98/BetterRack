import { Hono } from "hono";
import { ComicsController } from '../controllers/comicsController';
import type { TGetComicsApiModel } from "#src/types.ts";

export function comicsRouter(
    gcwModel: TGetComicsApiModel
){   
    const app = new Hono();
    const cc = new ComicsController(gcwModel);  
    app.get('/', (c) => cc.getComics(c));   
    app.get('/:id/links', (c) => cc.getLinks(c));
    return app;
}