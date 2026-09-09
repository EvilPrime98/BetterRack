import {
    UltraComponent,
    ultraCompState,
    ultraReplaceChildren,
    type IUltraCompStateStateful
} from "ultra-light-js";
import styles from './store-downloads.page.module.css';
import { Layout } from "../layout";
import { getDownloadJobs, type TJobStatus } from "@/services/store.service";
import { DOCUMENT_TITLE_CONTEXT } from "../context/document-title.context";
import { POLL_INTERVAL_MS } from "@/data";
import type { TStoreProgressEvent } from "../store.types";

interface IStoreDownloadsState {
    jobs: IUltraCompStateStateful<TJobStatus[]>;
    error: IUltraCompStateStateful<string>;
    loaded: IUltraCompStateStateful<boolean>;
    load: () => Promise<void>;
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

function JobRow(job: TJobStatus): string {
    const state = job.state;
    const percent = percentFor(job.progress);
    const detail = detailFor(job);

    const bar = percent === null
        ? ''
        : `<div class="${styles.progress}">
               <span class="${styles.progressFill}" style="width:${percent}%"></span>
           </div>
           <span class="${styles.percent}">${percent}%</span>`;

    return `<li class="${styles.row}" data-state="${state}">
        <div class="${styles.rowHead}">
            <span class="${styles.label}">${job.label}</span>
            <span class="${styles.badge}" data-state="${state}">${STATE_LABEL[state]}</span>
        </div>
        ${bar}
        ${detail ? `<span class="${styles.detail}">${detail}</span>` : ''}
    </li>`;
}

export function StoreDownloadsPage() {

    const store: IStoreDownloadsState = ultraCompState({

        jobs: [] as TJobStatus[],
        error: '',
        loaded: false,

        load: async (comp: IStoreDownloadsState) => {
            try {
                const jobs = await getDownloadJobs();
                comp.jobs.set(jobs);
                comp.error.set('');
            } catch (e) {
                comp.error.set(e instanceof Error ? e.message : 'Failed to load download jobs.');
            } finally {
                comp.loaded.set(true);
            }
        }

    });

    function renderList($list: HTMLElement) {
        const jobs = store.jobs.get();
        if (!jobs.length) return;
        ultraReplaceChildren($list, ...jobs.map(JobRow));
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
                    onMount: [renderList],
                    trigger: [{
                        subscriber: store.jobs.subscribe,
                        triggerFunction: renderList,
                        defer: true
                    }]
                })

            ]

        })

    );

}
