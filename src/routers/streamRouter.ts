import { Hono } from "hono";
import { streamController } from "#src/controllers/streamController..ts";
import type { TLibraryModel } from "#src/types.ts";

export function streamRouter({
    libModel
}:{
    libModel: TLibraryModel
}){ 
    const app = new Hono();
    const cc = new streamController(libModel);
    app.get('/:uuid', async (c) => await cc.get(c));
    return app;
}