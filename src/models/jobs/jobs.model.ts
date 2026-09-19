import { randomUUID } from "crypto";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { downloadJobs } from "#src/database/schema.ts";
import type { JobListener, TJob, TJobModel, TJobRequest, TJobState } from "./types";

const MAX_HISTORY_ROWS = 200;

const HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const TERMINAL_STATES: TJobState[] = ['done', 'error'];

export class JobModel<TProgress = unknown> implements TJobModel<TProgress> {

    private db: BunSQLiteDatabase;

    private jobs = new Map<string, TJob<TProgress>>();
    private jobIdByResource = new Map<string, string>();
    private listeners = new Map<string, Set<JobListener<TProgress>>>();

    constructor() {
        const dbPath = path.resolve('src/database/jobs.sqlite');
        mkdirSync(path.dirname(dbPath), { recursive: true });
        const sqlite = new Database(dbPath, { create: true });
        sqlite.run(`
            CREATE TABLE IF NOT EXISTS download_jobs (
                id TEXT PRIMARY KEY,
                resource_key TEXT NOT NULL,
                label TEXT NOT NULL,
                state TEXT NOT NULL,
                progress TEXT,
                comic_id INTEGER NOT NULL,
                output_dir TEXT,
                uuid TEXT,
                strat TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        `);
        this.db = drizzle(sqlite);
        this.reconcileInterruptedJobs();
        this.pruneHistory();
    }

    private rowToJob(
        row: typeof downloadJobs.$inferSelect
    ): TJob<TProgress> {
        return {
            id: row.id,
            resourceKey: row.resourceKey,
            label: row.label,
            state: row.state as TJobState,
            progress: row.progress ? JSON.parse(row.progress) as TProgress : undefined,
            request: {
                comicId: row.comicId,
                outputDir: row.outputDir ?? undefined,
                uuid: row.uuid ?? undefined,
                strat: row.strat ?? undefined,
            },
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    private persist(
        job: TJob<TProgress>
    ): void {
        const progress = job.progress === undefined ? null : JSON.stringify(job.progress);

        this.db.insert(downloadJobs)
            .values({
                id: job.id,
                resourceKey: job.resourceKey,
                label: job.label,
                state: job.state,
                progress,
                comicId: job.request.comicId,
                outputDir: job.request.outputDir ?? null,
                uuid: job.request.uuid ?? null,
                strat: job.request.strat ?? null,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
            })
            .onConflictDoUpdate({
                target: downloadJobs.id,
                set: {
                    state: job.state,
                    progress,
                    updatedAt: job.updatedAt,
                },
            })
            .run();
    }

    private reconcileInterruptedJobs(): void {
        const rows = this.db.select().from(downloadJobs).all();

        for (const row of rows) {
            const job = this.rowToJob(row);

            if (job.state === 'queued' || job.state === 'running') {
                job.state = 'error';
                job.progress = { type: 'error', message: 'Interrupted by server restart' } as TProgress;
                job.updatedAt = Date.now();
                this.persist(job);
            }

            this.jobs.set(job.id, job);
        }
    }

    private pruneHistory(): void {
        const cutoff = Date.now() - HISTORY_RETENTION_MS;

        const expired = this.db.select({ id: downloadJobs.id })
            .from(downloadJobs)
            .where(and(inArray(downloadJobs.state, TERMINAL_STATES), lt(downloadJobs.updatedAt, cutoff)))
            .all();

        const terminalRows = this.db.select({ id: downloadJobs.id })
            .from(downloadJobs)
            .where(inArray(downloadJobs.state, TERMINAL_STATES))
            .orderBy(desc(downloadJobs.updatedAt))
            .all();

        const staleIds = new Set([
            ...expired.map((row) => row.id),
            ...terminalRows.slice(MAX_HISTORY_ROWS).map((row) => row.id),
        ]);

        if (staleIds.size === 0) return;

        this.db.delete(downloadJobs).where(inArray(downloadJobs.id, [...staleIds])).run();
        for (const id of staleIds) this.jobs.delete(id);
    }

    private notify(
        job: TJob<TProgress>
    ): void {
        const set = this.listeners.get(job.id);
        if (!set) return;
        for (const listener of set) listener(job);
    }

    public getOrCreate(
        resourceKey: string,
        label: string,
        request: TJobRequest
    ): { job: TJob<TProgress>; created: boolean } {

        const existingId = this.jobIdByResource.get(resourceKey);
        const existing = existingId ? this.jobs.get(existingId) : undefined;

        if (existing) return { job: existing, created: false };

        const job: TJob<TProgress> = {
            id: randomUUID(),
            resourceKey,
            label,
            state: 'queued',
            request,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        this.jobs.set(job.id, job);
        this.jobIdByResource.set(resourceKey, job.id);
        this.persist(job);
        this.pruneHistory();

        return { job, created: true };
    }

    public getByResource(
        resourceKey: string
    ): TJob<TProgress> | undefined {
        const jobId = this.jobIdByResource.get(resourceKey);
        return jobId ? this.jobs.get(jobId) : undefined;
    }

    public get(
        jobId: string
    ): TJob<TProgress> | undefined {
        return this.jobs.get(jobId);
    }

    public list(): TJob<TProgress>[] {
        return [...this.jobs.values()];
    }

    public update(
        jobId: string,
        state: TJobState,
        progress?: TProgress
    ): void {
        const job = this.jobs.get(jobId);
        if (!job) return;

        job.state = state;
        if (progress !== undefined) job.progress = progress;
        job.updatedAt = Date.now();

        if (TERMINAL_STATES.includes(state)) this.jobIdByResource.delete(job.resourceKey);

        this.persist(job);

        if (TERMINAL_STATES.includes(state)) this.pruneHistory();

        this.notify(job);
    }

    public retry(
        jobId: string
    ): TJob<TProgress> | undefined {
        const job = this.jobs.get(jobId);
        if (!job || job.state !== 'error') return undefined;

        job.state = 'queued';
        job.progress = undefined;
        job.updatedAt = Date.now();

        this.jobIdByResource.set(job.resourceKey, job.id);
        this.persist(job);
        this.notify(job);

        return job;
    }

    public remove(
        jobId: string
    ): boolean {
        const job = this.jobs.get(jobId);
        if (!job) return false;

        job.state = 'error';
        job.progress = { type: 'error', message: 'Download cancelled' } as TProgress;
        job.updatedAt = Date.now();
        this.notify(job);

        this.jobs.delete(jobId);
        if (this.jobIdByResource.get(job.resourceKey) === jobId) this.jobIdByResource.delete(job.resourceKey);
        this.listeners.delete(jobId);
        this.db.delete(downloadJobs).where(eq(downloadJobs.id, jobId)).run();

        return true;
    }

    public subscribe(
        jobId: string,
        listener: JobListener<TProgress>
    ): () => void {
        let set = this.listeners.get(jobId);
        if (!set) {
            set = new Set();
            this.listeners.set(jobId, set);
        }
        set.add(listener);
        return () => {
            set!.delete(listener);
            if (set!.size === 0) this.listeners.delete(jobId);
        };
    }

}
