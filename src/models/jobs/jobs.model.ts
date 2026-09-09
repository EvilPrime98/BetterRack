import { randomUUID } from "crypto";
import type { JobListener, TJob, TJobModel, TJobState } from "./types";

const JOB_RETENTION_MS = 5 * 60 * 1000;

const TERMINAL_STATES: TJobState[] = ['done', 'error'];

export class JobModel<TProgress = unknown> implements TJobModel<TProgress> {

    private jobs = new Map<string, TJob<TProgress>>();
    private jobIdByResource = new Map<string, string>();
    private listeners = new Map<string, Set<JobListener<TProgress>>>();

    private releaseResource(
        job: TJob<TProgress>
    ): void {
        this.jobIdByResource.delete(job.resourceKey);
        setTimeout(() => this.jobs.delete(job.id), JOB_RETENTION_MS).unref();
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
        label: string
    ): { job: TJob<TProgress>; created: boolean } {

        const existingId = this.jobIdByResource.get(resourceKey);
        const existing = existingId ? this.jobs.get(existingId) : undefined;

        if (existing) return { job: existing, created: false };

        const job: TJob<TProgress> = {
            id: randomUUID(),
            resourceKey,
            label,
            state: 'queued',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        this.jobs.set(job.id, job);
        this.jobIdByResource.set(resourceKey, job.id);

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

        if (TERMINAL_STATES.includes(state)) this.releaseResource(job);

        this.notify(job);
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
