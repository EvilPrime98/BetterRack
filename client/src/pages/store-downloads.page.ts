import {
    UltraComponent,
    ultraCompState,
    ultraReplaceChildren,
    type IUltraCompStateStateful
} from "ultra-light-js";
import styles from './store-downloads.page.module.css';
import { Layout } from "../layout";
import { cancelDownloadJob, getDownloadJobs, retryDownloadJob, type TJobStatus } from "@/services/store.service";
import { DOCUMENT_TITLE_CONTEXT } from "../context/document-title.context";
import { LIBRARY_CONTEXT } from "../context/library.context";
import { CONFIRM_MODAL_CTX } from "../context/confirm-modal.context";
import { toast } from "@/services/toast.service";
import { POLL_INTERVAL_MS } from "@/data";
import type { TStoreProgressEvent } from "../store.types";

interface IStoreDownloadsState {
    jobs: IUltraCompStateStateful<TJobStatus[]>;
    error: IUltraCompStateStateful<string>;
    loaded: IUltraCompStateStateful<boolean>;
    retryingIds: IUltraCompStateStateful<Set<string>>;
    stoppingIds: IUltraCompStateStateful<Set<string>>;
    load: () => Promise<void>;
    retry: (jobId: string) => Promise<void>;
    stop: (job: TJobStatus) => Promise<void>;
}

const STATE_LABEL: Record<TJobStatus['state'], string> = {
    queued: 'Queued',
    running: 'Downloading',
    done: 'Done',
    error: 'Failed'
};

function percentFor(progress?: TStoreProgressEvent): number | null {
    if (!progress) return null;
    if (progress.type === 'progress') return Math.round(progress.percent);
    if (progress.type === 'extracting') {
        return progress.total > 0
            ? Math.round((progress.done / progress.total) * 100)
            : null;
    }
    return null;
}

function detailFor(job: TJobStatus): string {
    const progress = job.progress;
    if (!progress) return '';
    switch (progress.type) {
        case 'preparing':
            return 'Preparing…';
        case 'retrying':
            return progress.status
                ? `Retrying after HTTP ${progress.status} — waiting ${progress.delaySec}s`
                : `Connection lost — retrying in ${progress.delaySec}s`;
        case 'progress':
            return `${progress.receivedMB} / ${progress.totalMB} MB`;
        case 'extracting':
            return `Extracting ${progress.done} / ${progress.total}`;
        case 'done':
            return progress.filename;
        case 'error':
            return progress.message;
    }
}

function canStop(job: TJobStatus): boolean {
    const isActive = job.state === 'queued' || job.state === 'running';
    return isActive && job.progress?.type !== 'extracting';
}

type TJobStates = Map<string, TJobStatus['state']>;

function stateByJobId(jobs: TJobStatus[]): TJobStates {
    return new Map(jobs.map((job) => [job.jobId, job.state]));
}

function findNewlyDone(previous: TJobStates, jobs: TJobStatus[]): TJobStatus[] {
    return jobs.filter((job) => {
        const before = previous.get(job.jobId);
        return job.state === 'done' && before !== undefined && before !== 'done';
    });
}

async function notifyFinished(finished: TJobStatus[]) {
    if (finished.length === 0) return;
    finished.forEach((job) => toast.success(`${job.label} downloaded`));
    await LIBRARY_CONTEXT.refreshLibrary({ silent: true });
}

function JobRow(job: TJobStatus, retryingIds: Set<string>, stoppingIds: Set<string>): string {
    const state = job.state;
    const percent = percentFor(job.progress);
    const detail = detailFor(job);

    const bar = percent === null
        ? ''
        : `<div class="${styles.progress}">
               <span class="${styles.progressFill}" style="width:${percent}%"></span>
           </div>
           <span class="${styles.percent}">${percent}%</span>`;

    const retry = state === 'error'
        ? `<button type="button" class="${styles.retry}" data-retry-job-id="${job.jobId}"${retryingIds.has(job.jobId) ? ' disabled' : ''}>Retry</button>`
        : '';

    const stop = canStop(job)
        ? `<button type="button" class="${styles.stop}" data-stop-job-id="${job.jobId}"${stoppingIds.has(job.jobId) ? ' disabled' : ''}>Stop</button>`
        : '';

    return `<li class="${styles.row}" data-state="${state}">
        <div class="${styles.rowHead}">
            <span class="${styles.label}">${job.label}</span>
            <span class="${styles.badge}" data-state="${state}">${STATE_LABEL[state]}</span>
        </div>
        ${bar}
        ${detail ? `<span class="${styles.detail}">${detail}</span>` : ''}
        ${retry}
        ${stop}
    </li>`;
}

export function StoreDownloadsPage() {

    let previousStates: TJobStates = new Map();

    const store: IStoreDownloadsState = ultraCompState({

        jobs: [] as TJobStatus[],
        error: '',
        loaded: false,
        retryingIds: new Set<string>(),
        stoppingIds: new Set<string>(),

        load: async (comp: IStoreDownloadsState) => {
            try {
                const jobs = await getDownloadJobs();
                const finished = findNewlyDone(previousStates, jobs);
                previousStates = stateByJobId(jobs);
                comp.jobs.set(jobs);
                comp.error.set('');
                notifyFinished(finished);
            } catch (e) {
                comp.error.set(e instanceof Error ? e.message : 'Failed to load download jobs.');
            } finally {
                comp.loaded.set(true);
            }
        },

        retry: async (comp: IStoreDownloadsState, jobId: string) => {
            comp.retryingIds.set(new Set(comp.retryingIds.get()).add(jobId));
            try {
                await retryDownloadJob(jobId);
                await comp.load();
            } finally {
                const next = new Set(comp.retryingIds.get());
                next.delete(jobId);
                comp.retryingIds.set(next);
            }
        },

        stop: async (comp: IStoreDownloadsState, job: TJobStatus) => {
            const confirmed = await CONFIRM_MODAL_CTX.confirmDialog({
                title: 'Stop this download?',
                message: `"${job.label}" will be stopped and removed from the list.`,
                confirmLabel: 'Stop download'
            });
            if (!confirmed) return;
            comp.stoppingIds.set(new Set(comp.stoppingIds.get()).add(job.jobId));
            try {
                await cancelDownloadJob(job.jobId);
                await comp.load();
            } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to stop the download.');
            } finally {
                const next = new Set(comp.stoppingIds.get());
                next.delete(job.jobId);
                comp.stoppingIds.set(next);
            }
        }

    });

    function renderList($list: HTMLElement) {
        const jobs = store.jobs.get();
        if (!jobs.length) return;
        const retryingIds = store.retryingIds.get();
        const stoppingIds = store.stoppingIds.get();
        ultraReplaceChildren($list, ...jobs.map((job) => JobRow(job, retryingIds, stoppingIds)));
    }

    function onListClick(event: Event) {
        const $target = event.target as HTMLElement;
        const retryJobId = $target.closest<HTMLButtonElement>('[data-retry-job-id]')?.dataset.retryJobId;
        if (retryJobId) {
            store.retry(retryJobId);
            return;
        }
        const stopJobId = $target.closest<HTMLButtonElement>('[data-stop-job-id]')?.dataset.stopJobId;
        const job = store.jobs.get().find((item) => item.jobId === stopJobId);
        if (job) store.stop(job);
    }

    function renderEmpty($p: HTMLElement) {
        if (store.error.get()) {
            $p.textContent = store.error.get();
            return;
        }
        $p.textContent = store.loaded.get()
            ? 'No active downloads.'
            : 'Loading downloads…';
    }

    return Layout(

        UltraComponent({

            component: '<section></section>',

            className: [styles.page],

            onMount: [
                () => DOCUMENT_TITLE_CONTEXT.setTitle('Downloads'),
                () => {
                    store.load();
                    const timer = setInterval(() => store.load(), POLL_INTERVAL_MS);
                    return () => clearInterval(timer);
                }
            ],

            children: [

                UltraComponent({
                    component: '<header></header>',
                    className: [styles.header],
                    children: [
                        `<span class="${styles.eyebrow}">Store</span>`,
                        `<h1 class="${styles.title}">Downloads</h1>`
                    ]
                }),

                UltraComponent({
                    component: '<p></p>',
                    className: [styles.empty],
                    onMount: [renderEmpty],
                    trigger: [{
                        subscriber: [
                            store.jobs.subscribe,
                            store.error.subscribe,
                            store.loaded.subscribe
                        ],
                        triggerFunction: ($p: HTMLElement) => {
                            $p.hidden = store.jobs.get().length > 0;
                            renderEmpty($p);
                        }
                    }]
                }),

                UltraComponent({
                    component: '<ul></ul>',
                    className: [styles.list],
                    eventHandler: { click: onListClick },
                    onMount: [renderList],
                    trigger: [{
                        subscriber: [store.jobs.subscribe, store.retryingIds.subscribe, store.stoppingIds.subscribe],
                        triggerFunction: renderList,
                        defer: true
                    }]
                })

            ]

        })

    );

}
