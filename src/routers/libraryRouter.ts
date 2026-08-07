import { Hono } from "hono";
import type { TLibraryModel } from "#src/types.ts";
import { libraryController } from "#src/controllers/libraryController.ts";

export function libraryRouter(
    libModel: TLibraryModel
){   
    const app = new Hono();
    const cc = new libraryController(libModel);
    app.get('/', (c) => cc.get(c));
    app.get('/preferences/:uid', (c) => cc.getPreferences(c));
    app.on(['PATCH', 'PUT', 'POST'], '/preferences/:uid', (c) => cc.updatePreferences(c));
    app.get('/refresh', (c) => cc.refresh(c));
    app.post('/folder', (c) => cc.createFolder(c));
    app.post('/file/move', (c) => cc.moveFile(c));
    app.delete('/folder', (c) => cc.deleteFolder(c));
    app.delete('/file', (c) => cc.deleteFile(c));
    app.post('/file/unidentify', (c) => cc.unidentifyFile(c));
    return app;
}