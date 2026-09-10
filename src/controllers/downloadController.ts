import type { TDownloadModel, TGetComicsApiModel, TLibraryModel, TStrat, TProgressEvent } from "#src/types.ts";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { fsModel } from "#src/types.ts";
import { logger } from "#utils/logger";
import { CLOUDFLARE_CHALLENGE_USER_MESSAGE, isCloudflareChallengeError } from "#src/models/rotating-fetch/cloudflare.ts";
import type { TJob, TJobModel, TJobState } from "#src/types/jobs.types.ts";

const log = logger.child({ module: 'DownloadController' });

const STATE_BY_EVENT_TYPE: Record<TProgressEvent['type'], TJobState> = {
    preparing: 'running',
    retrying: 'running',
    progress: 'running',
    extracting: 'running',
    done: 'done',
    error: 'error',
};

export class DownloadController {

    private dwnModel: TDownloadModel;
    private gcwModel: TGetComicsApiModel;
    private fsModel: fsModel;
    private libModel: TLibraryModel;
    private jobModel: TJobModel<TProgressEvent>;

    constructor(
        dwnModel: TDownloadModel,
        gcwModel: TGetComicsApiModel,
        fsModel: fsModel,
        libModel: TLibraryModel,
        jobModel: TJobModel<TProgressEvent>
    ) {
        this.dwnModel = dwnModel;
        this.gcwModel = gcwModel;
        this.fsModel = fsModel;
        this.libModel = libModel;
        this.jobModel = jobModel;
    }
    
    private runDownload(
        jobId: string,
        link: { title: string; downloadLink: string },
        outputDir: string
    ) {
        this.jobModel.update(jobId, 'running');

        this.dwnModel.downloadComic({
            link,
            outputDir,
            onProgress: async (event) => {
                if (event.type === 'done') {
                    try {
                        await this.libModel.scan();
                    } catch (err) {
                        log.error({ err }, 'Library rescan after download failed');
                    }
                }
                this.jobModel.update(jobId, STATE_BY_EVENT_TYPE[event.type], event);
            }
        }).catch((e) => {
            log.error({ err: e }, 'Download job failed');
            this.jobModel.update(jobId, 'error', {
                type: 'error',
                message: isCloudflareChallengeError(e)
                    ? CLOUDFLARE_CHALLENGE_USER_MESSAGE
                    : e instanceof Error ? e.message : 'Failed to download'
            });
        });
    }

    private toStatusPayload(
        job: TJob<TProgressEvent>
    ) {
        return {
            jobId: job.id,
            state: job.state,
            label: job.label,
            progress: job.progress
        };
    }

    public async downloadComicSSE(
        c: Context
    ) {

        try {

            const { id, title, outputDir, uuid, csd, strat } = c.req.query();

            if (!id || !title || !uuid) {
                return c.json({
                    error: true,
                    message: 'Missing id, title, or uuid'
                }, 422);
            }

            const downloadLink = await this.gcwModel.getDownloadLinkFromPost(
                parseInt(id),
                strat as TStrat,
                uuid
            );

            if (!downloadLink) {
                return c.json({
                    error: true,
                    message: 'This comic cannot be downloaded'
                }, 400);
            }

            if (csd === 'true') {

                return c.json({
                    error: false,
                    message: 'OK',
                    downloadLink
                }, 200);

            }

            const { job, created } = this.jobModel.getOrCreate(id, title);

            if (created) {
                const outputDirPath = await this.fsModel.getFullPath(outputDir || '/');
                this.runDownload(job.id, { title, downloadLink }, outputDirPath);
            }

            return c.json({
                error: false,
                jobId: job.id,
                state: job.state
            }, created ? 201 : 200);

        } catch (e) {

            if (isCloudflareChallengeError(e)) {
                log.error({ err: e }, 'Comic download blocked by a Cloudflare challenge');
                return c.json({
                    error: true,
                    message: CLOUDFLARE_CHALLENGE_USER_MESSAGE
                }, 502);
            }

            log.error({ err: e }, 'Failed to start comic download');

            return c.json({
                error: true,
                message: 'Failed to start comic download'
            }, 500);

        }

    }

    public async downloadComic(
        c: Context
    ) {

        try {

            const body = await c.req.json().catch(() => ({} as Record<string, unknown>));
            const { id, title, outputDir, uuid, csd, strat } = body as {
                id?: number;
                title?: string;
                outputDir?: string;
                uuid?: string;
                csd?: boolean;
                strat?: TStrat;
            };

            if (!id || !title || !uuid) {
                return c.json({
                    error: true,
                    message: 'Missing id, title, or uuid'
                }, 422);
            }

            const downloadLink = await this.gcwModel.getDownloadLinkFromPost(
                id,
                strat as TStrat,
                uuid
            );

            if (!downloadLink) {
                return c.json({
                    error: true,
                    message: 'This comic cannot be downloaded'
                }, 400);
            }

            if (csd) {

                return c.json({
                    error: false,
                    message: 'OK',
                    downloadLink
                }, 200);

            }

            const { job, created } = this.jobModel.getOrCreate(String(id), title);

            if (created) {
                const outputDirPath = await this.fsModel.getFullPath(outputDir || '/');
                this.runDownload(job.id, { title, downloadLink }, outputDirPath);
            }

            return c.json({
                error: false,
                jobId: job.id,
                state: job.state
            }, created ? 201 : 200);

        } catch (e) {

            if (isCloudflareChallengeError(e)) {
                log.error({ err: e }, 'Comic download blocked by a Cloudflare challenge');
                return c.json({
                    error: true,
                    message: CLOUDFLARE_CHALLENGE_USER_MESSAGE
                }, 502);
            }

            log.error({ err: e }, 'Failed to start comic download');

            return c.json({
                error: true,
                message: 'Failed to start comic download'
            }, 500);

        }

    }

    public async listJobs(
        c: Context
    ) {
        // createdAt, not updatedAt: progress ticks bump updatedAt and churn the order.
        const rank: Record<TJobState, number> = { running: 0, queued: 1, error: 2, done: 3 };

        const jobs = this.jobModel.list()
            .sort((a, b) =>
                rank[a.state] - rank[b.state]
                || b.createdAt - a.createdAt
                || a.id.localeCompare(b.id))
            .map((job) => this.toStatusPayload(job));

        return c.json({ error: false, jobs });
    }

    public async getJobByResource(
        c: Context
    ) {
        const id = c.req.param('id') ?? '';
        const job = this.jobModel.getByResource(id);

        return c.json({
            error: false,
            job: job ? this.toStatusPayload(job) : null
        });
    }

    public async getJobStatus(
        c: Context
    ) {
        const job = this.jobModel.get(c.req.param('jobId') ?? '');

        if (!job) {
            return c.json({ error: true, message: 'Job not found' }, 404);
        }

        return c.json({ error: false, ...this.toStatusPayload(job) });
    }

    public async streamJob(
        c: Context
    ) {
        const job = this.jobModel.get(c.req.param('jobId') ?? '');

        if (!job) {
            return c.json({ error: true, message: 'Job not found' }, 404);
        }

        const jobModel = this.jobModel;

        return streamSSE(c, async (stream) => {
            const emit = (j: TJob<TProgressEvent>) =>
                stream.writeSSE({ data: JSON.stringify(this.toStatusPayload(j)) });

            await emit(job);

            if (job.state === 'done' || job.state === 'error') return;

            await new Promise<void>((resolve) => {
                const unsubscribe = jobModel.subscribe(job.id, (updated) => {
                    emit(updated);
                    if (updated.state === 'done' || updated.state === 'error') {
                        unsubscribe();
                        resolve();
                    }
                });

                stream.onAbort(() => {
                    unsubscribe();
                    resolve();
                });
            });
        });
    }

}
