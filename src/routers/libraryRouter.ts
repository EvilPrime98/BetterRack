import { Hono } from "hono";
import type { TIdentifyProgress, TLibraryModel } from "#src/types.ts";
import type { TJobModel } from "#src/types/jobs.types.ts";
import { libraryController } from "#src/controllers/libraryController.ts";

export function libraryRouter(
    libModel: TLibraryModel,
    jobModel: TJobModel<TIdentifyProgress>
){
    const app = new Hono();
    const cc = new libraryController(libModel, jobModel);
    app.get('/', (c) => cc.get(c));
    app.get('/by-series', (c) => cc.getBySeries(c));
    app.get('/index', (c) => cc.getIndex(c));
    app.get('/recent', (c) => cc.getRecent(c));
    app.get('/reading', (c) => cc.getReading(c));
    app.get('/preferences/:uid', (c) => cc.getPreferences(c));
    app.on(['PATCH', 'PUT', 'POST'], '/preferences/:uid', (c) => cc.updatePreferences(c));
    app.get('/refresh', (c) => cc.refresh(c));
    app.post('/folder', (c) => cc.createFolder(c));
    app.post('/file/move', (c) => cc.moveFile(c));
    app.delete('/folder', (c) => cc.deleteFolder(c));
    app.delete('/file', (c) => cc.deleteFile(c));
    app.post('/file/unidentify', (c) => cc.unidentifyFile(c));
    app.post('/file/identify', (c) => cc.commitIdentify(c));
    app.post('/identify/reset-all', (c) => cc.reidentifyAll(c));
    app.post('/identify/all', (c) => cc.startIdentifyLibrary(c));
    app.get('/identify/all', (c) => cc.getIdentifyLibraryStatus(c));
    app.get('/:uid/identify',(c) => cc.identify(c));
    app.post('/:uid/identify/reset', (c) => cc.reidentifyFile(c));
    return app;
}