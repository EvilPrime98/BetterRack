import { Hono } from "hono";
import type { TDownloadModel, TGetComicsApiModel, TLibraryModel, TProgressEvent } from "#src/types.ts";
import type { fsModel } from "#src/types.ts";
import { DownloadController } from "#src/controllers/downloadController.ts";
import type { TJobModel } from "#src/types/jobs.types.ts";

export function downloadsRouter(
    dwnModel: TDownloadModel,
    gcwModel: TGetComicsApiModel,
    fsModel: fsModel,
    libModel: TLibraryModel,
    jobModel: TJobModel<TProgressEvent>
){
    const app = new Hono();
    const cc = new DownloadController(dwnModel, gcwModel, fsModel, libModel, jobModel);
    app.get('/', (c) => cc.downloadComicSSE(c));
    app.post('/', (c) => cc.downloadComic(c));
    app.get('/jobs', (c) => cc.listJobs(c));
    app.get('/resource/:id', (c) => cc.getJobByResource(c));
    app.get('/:jobId', (c) => cc.getJobStatus(c));
    app.get('/:jobId/stream', (c) => cc.streamJob(c));
    return app;
}