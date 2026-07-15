import { Hono } from "hono";
import type { TDownloadModel, TGetComicsApiModel, TLibraryModel } from "#src/types.ts";
import type { fsModel } from "#src/types.ts";
import { DownloadController } from "#src/controllers/downloadController.ts";

export function downloadsRouter(
    dwnModel: TDownloadModel,
    gcwModel: TGetComicsApiModel,
    fsModel: fsModel,
    libModel: TLibraryModel
){   
    const app = new Hono();
    const cc = new DownloadController(dwnModel, gcwModel, fsModel, libModel);
    app.get('/', (c) => cc.downloadComic(c));
    return app;
}