import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { DownloadController } from './downloadController';
import type { TDownloadModel, TGetComicsApiModel, TLibraryModel, TProgressEvent, fsModel } from '#src/types.ts';
import type { TJob, TJobModel, TJobState } from '#src/types/jobs.types.ts';

function memoryJobModel(): TJobModel<TProgressEvent> {
    const jobs = new Map<string, TJob<TProgressEvent>>();
    return {
        getOrCreate: (resourceKey, label, request) => {
            const job: TJob<TProgressEvent> = {
                id: `job-${jobs.size + 1}`,
                resourceKey,
                label,
                state: 'queued',
                request,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            jobs.set(job.id, job);
            return { job, created: true };
        },
        getByResource: (resourceKey) => [...jobs.values()].find(j => j.resourceKey === resourceKey),
        get: (jobId) => jobs.get(jobId),
        list: () => [...jobs.values()],
        update: (jobId, state: TJobState, progress) => {
            const job = jobs.get(jobId);
            if (!job) return;
            job.state = state;
            if (progress !== undefined) job.progress = progress;
        },
        retry: () => undefined,
        remove: (jobId) => jobs.delete(jobId),
        subscribe: () => () => {},
    };
}

function buildHarness() {
    const jobModel = memoryJobModel();
    const started: { signal?: AbortSignal } = {};
    const dwnModel = {
        downloadComic: ({ signal }: { signal?: AbortSignal }) => {
            started.signal = signal;
            return new Promise<string | undefined>(() => {});
        },
    } as unknown as TDownloadModel;
    const gcwModel = { getDownloadLinkFromPost: async () => 'https://example.test/comic.cbz' } as unknown as TGetComicsApiModel;
    const files = { getFullPath: async (dir: string) => dir } as unknown as fsModel;
    const libModel = { scan: async () => {} } as unknown as TLibraryModel;

    const controller = new DownloadController(dwnModel, gcwModel, files, libModel, jobModel);
    const app = new Hono();
    app.post('/', (c) => controller.downloadComic(c));
    app.delete('/:jobId', (c) => controller.cancelJob(c));

    const startJob = async () => {
        const res = await app.request('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 7, title: 'Comic', uuid: 'u-1', outputDir: '/' }),
        });
        const { jobId } = await res.json() as { jobId: string };
        return jobId;
    };

    return { app, jobModel, started, startJob };
}

describe('DownloadController.cancelJob', () => {

    test('answers 404 for an unknown job', async () => {
        const { app } = buildHarness();

        const res = await app.request('/missing', { method: 'DELETE' });

        expect(res.status).toBe(404);
    });

    test('aborts the download and removes the job while it is running', async () => {
        const { app, jobModel, started, startJob } = buildHarness();
        const jobId = await startJob();

        const res = await app.request(`/${jobId}`, { method: 'DELETE' });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ error: false, jobId });
        expect(started.signal?.aborted).toBe(true);
        expect(jobModel.get(jobId)).toBeUndefined();
    });

    test('refuses to stop a job that already finished', async () => {
        const { app, jobModel, startJob } = buildHarness();
        const jobId = await startJob();
        jobModel.update(jobId, 'done', { type: 'done', filename: 'comic.cbz' });

        const res = await app.request(`/${jobId}`, { method: 'DELETE' });

        expect(res.status).toBe(409);
        expect(jobModel.get(jobId)).toBeDefined();
    });

    test('refuses to stop a job that is extracting', async () => {
        const { app, jobModel, started, startJob } = buildHarness();
        const jobId = await startJob();
        jobModel.update(jobId, 'running', { type: 'extracting', title: 'Comic', done: 1, total: 4 });

        const res = await app.request(`/${jobId}`, { method: 'DELETE' });

        expect(res.status).toBe(409);
        expect(started.signal?.aborted).toBe(false);
        expect(jobModel.get(jobId)).toBeDefined();
    });

});
