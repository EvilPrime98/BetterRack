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
    getOrCreate: (resourceKey: string, label: string) => { job: TJob<TProgress>; created: boolean },
    getByResource: (resourceKey: string) => TJob<TProgress> | undefined,
    get: (jobId: string) => TJob<TProgress> | undefined,
    list: () => TJob<TProgress>[],
    update: (jobId: string, state: TJobState, progress?: TProgress) => void,
    subscribe: (jobId: string, listener: (job: TJob<TProgress>) => void) => () => void,
}