import { Hono } from "hono";
import type { TLibraryModel, TZipModel } from "#src/types.ts";
import { comicReaderController } from "#src/controllers/comic-reader.controller.ts";

export function comicReaderRouter({
    libModel,
    zipModel
}:{
    libModel: TLibraryModel;
    zipModel: TZipModel;
}){ 
    const app = new Hono();
    const cc = new comicReaderController(libModel, zipModel);
    app.get('/:uuid', async (c) => await cc.get(c));
    app.get('/:uuid/refresh', async (c) => await cc.refresh(c));
    app.get('/:uuid/bookmarks', async (c) => await cc.getBookmarks(c));
    app.get('/:uuid/pages/:page', async (c) => await cc.getPage(c));
    return app;
}