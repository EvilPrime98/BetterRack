export type TJobState = 'queued' | 'running' | 'done' | 'error';

export type TJobKind = 'download' | 'identify-library';

export type TJobRequest = {
    comicId: number;
    outputDir?: string;
    uuid?: string;
    strat?: string;
}

export type TJob<TProgress = unknown> = {
    id: string;
    kind: TJobKind;
    resourceKey: string;
    label: string;
    state: TJobState;
    progress?: TProgress;
    request: TJobRequest;
    createdAt: number;
    updatedAt: number;
}

export type TJobModel<TProgress = unknown> = {
    getOrCreate: (resourceKey: string, label: string, request: TJobRequest, kind?: TJobKind) => { job: TJob<TProgress>; created: boolean },
    getByResource: (resourceKey: string) => TJob<TProgress> | undefined,
    get: (jobId: string) => TJob<TProgress> | undefined,
    list: (kind?: TJobKind) => TJob<TProgress>[],
    update: (jobId: string, state: TJobState, progress?: TProgress) => void,
    retry: (jobId: string) => TJob<TProgress> | undefined,
    remove: (jobId: string) => boolean,
    subscribe: (jobId: string, listener: (job: TJob<TProgress>) => void) => () => void,
}