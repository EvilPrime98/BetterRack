export type JobListener<TProgress> = (job: TJob<TProgress>) => void;

export type TJobState = 'queued' | 'running' | 'done' | 'error';

export type TJob<TProgress = unknown> = {
    id: string;
    resourceKey: string;
    label: string;
    state: TJobState;
    progress?: TProgress;
    createdAt: number;
    updatedAt: number;
}

export type TJobModel<TProgress = unknown> = {
    /** Returns the in-flight job for `resourceKey`, or creates and registers a new one. */
    getOrCreate: (resourceKey: string, label: string) => { job: TJob<TProgress>; created: boolean },
    /** Returns the in-flight job for `resourceKey`, if any. */
    getByResource: (resourceKey: string) => TJob<TProgress> | undefined,
    /** Returns a job's information */
    get: (jobId: string) => TJob<TProgress> | undefined,
    /** Returns every tracked job, in-flight and within the retention window. */
    list: () => TJob<TProgress>[],
    /** Updates a job's information */
    update: (jobId: string, state: TJobState, progress?: TProgress) => void,
    /** Subscribe to a job's state */
    subscribe: (jobId: string, listener: (job: TJob<TProgress>) => void) => () => void,
}