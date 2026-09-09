import { useEffect, useState } from 'react';
import { Layout } from '@/layout';
import { getDownloadJobs, type TJobStatus } from '@/services/store.service';
import { useDocumentTitleStore } from '@/stores/documentTitle.store';
import { POLL_INTERVAL_MS } from '@/data';
import type { TStoreProgressEvent } from '@/store.types';
import styles from './store-downloads.page.module.css';

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

function detailFor(progress?: TStoreProgressEvent): string {
    if (!progress) return '';
    switch (progress.type) {
        case 'preparing':
            return 'Preparing…';
        case 'retrying':
            return `Retrying after HTTP ${progress.status} — waiting ${progress.delaySec}s`;
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

function JobRow({ job }: { job: TJobStatus }) {

    const percent = percentFor(job.progress);
    const detail = detailFor(job.progress);

    return (
        <li className={styles.row} data-state={job.state}>

            <div className={styles.rowHead}>
                <span className={styles.label}>{job.label}</span>
                <span className={styles.badge} data-state={job.state}>{STATE_LABEL[job.state]}</span>
            </div>

            {percent !== null && (
                <>
                    <div className={styles.progress}>
                        <span className={styles.progressFill} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={styles.percent}>{percent}%</span>
                </>
            )}

            {detail && <span className={styles.detail}>{detail}</span>}

        </li>
    );

}

export function StoreDownloadsPage() {

    const setTitle = useDocumentTitleStore((s) => s.setTitle);
    const [jobs, setJobs] = useState<TJobStatus[]>([]);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setTitle('Downloads');
    }, [setTitle]);

    useEffect(() => {

        let active = true;

        async function load() {
            try {
                const next = await getDownloadJobs();
                if (!active) return;
                setJobs(next);
                setError('');
            } catch (e) {
                if (!active) return;
                setError(e instanceof Error ? e.message : 'Failed to load download jobs.');
            } finally {
                if (active) setLoaded(true);
            }
        }

        load();
        const timer = setInterval(load, POLL_INTERVAL_MS);

        return () => {
            active = false;
            clearInterval(timer);
        };

    }, []);

    return (
        <Layout>
            <section className={styles.page}>

                <header className={styles.header}>
                    <span className={styles.eyebrow}>Store</span>
                    <h1 className={styles.title}>Downloads</h1>
                </header>

                {jobs.length === 0 ? (
                    <p className={styles.empty}>
                        {error ? error : loaded ? 'No active downloads.' : 'Loading downloads…'}
                    </p>
                ) : (
                    <ul className={styles.list}>
                        {jobs.map(job => <JobRow key={job.jobId} job={job} />)}
                    </ul>
                )}

            </section>
        </Layout>
    );

}
