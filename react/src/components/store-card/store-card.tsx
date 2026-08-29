import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type SyntheticEvent } from 'react';
import styles from './store-card.module.css';
import { ImageGen } from '@/components/image-generic/image-generic';
import { NO_IMAGE_URL } from '@/data';
import { useDownloadDirModalContext } from '@/context/DownloadDirModalContext';
import { useLibraryStore } from '@/stores/library.store';
import { getComicLinks, downloadComicPolling, getResourceJob, pollJobStatus } from '@/services/store.service';
import { toast } from '@/services/toast.service';
import { CheckIcon } from '@/icons/check.icon';
import { STRAT, type IStoreLink, type IStorePost, type TCardState } from '@/store.types';
import { BRButton } from '@/components/br-button/br-button';

export function StoreCard({
    item
}: {
    item: IStorePost
}) {

    const { openDownloadDirModal } = useDownloadDirModalContext();

    const [state, setState] = useState<TCardState>({ status: 'idle' });
    const [coverLoaded, setCoverLoaded] = useState(false);
    const lastRenderable = useRef<TCardState>(state);
    const displayState = state.status === 'links-loading' ? lastRenderable.current : state;

    function onEnterOrSpace(handler: () => void) {
        return (e: ReactKeyboardEvent) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            handler();
        };
    }

    async function completeDownload() {
        setState({ status: 'done' });
        toast.success(`${item.title} downloaded`);
        await useLibraryStore.getState().refreshLibrary({ silent: true });
    }

    async function startDownload(link: IStoreLink) {

        if (!item.id) return;

        const prev = state;
        const outputDir = await openDownloadDirModal(link.title);

        if (!outputDir) {
            setState(prev.status === 'links-ready' ? prev : { status: 'idle' });
            return;
        }

        setState({ status: 'downloading', title: link.title, percent: 0 });

        try {
            await downloadComicPolling({
                id: item.id,
                title: link.title,
                uuid: link.uuid,
                outputDir,
                strat: STRAT,
                onProgress: (event) => {
                    if (event.type === 'progress') {
                        setState({ status: 'downloading', title: link.title, percent: event.percent });
                    }
                }
            });
            await completeDownload();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Download failed.';
            setState({ status: 'error', message });
            toast.error(message);
        }

    }

    async function onDownloadClick() {

        if (!item.id) return;

        setState({ status: 'links-loading' });

        try {
            const links = await getComicLinks(item.id, STRAT);
            if (links.length === 0) {
                setState({ status: 'error', message: 'No download links found.' });
                return;
            }
            if (links.length === 1) {
                await startDownload(links[0]);
            } else {
                setState({ status: 'links-ready', links });
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to fetch links.';
            setState({ status: 'error', message });
            toast.error(message);
        }

    }

    function onCoverLoad() {
        setCoverLoaded(true);
    }

    function onCoverError(e: SyntheticEvent<HTMLImageElement>) {
        const $img = e.currentTarget;
        if ($img.src === NO_IMAGE_URL) {
            setCoverLoaded(true);
            return;
        }
        $img.src = NO_IMAGE_URL;
    }

    function renderAction(curr: TCardState) {

        if (curr.status === 'idle') {

            return (
                <BRButton text="" onClick={onDownloadClick}>
                    <span>Download</span>
                </BRButton>
            );

        }

        if (curr.status === 'downloading') {

            return (
                <div className={styles.progressWrap}>
                    <div className={styles.progress} aria-label={`Downloading ${curr.percent}%`}>
                        <span className={styles.progressFill} style={{ width: `${curr.percent}%` }} />
                    </div>
                    <span className={styles.progressPercent}>{curr.percent}%</span>
                </div>
            );

        }

        if (curr.status === 'done') {

            return (
                <span className={styles.doneLabel}>
                    <CheckIcon size={14} />
                    Downloaded
                </span>
            );

        }

        if (curr.status === 'error') {

            return (
                <BRButton text="" className={styles.retryBtn} onClick={onDownloadClick}>
                    <span>Retry</span>
                </BRButton>
            );

        }

        if (curr.status === 'links-ready') {

            return (
                <ul className={styles.linkList} role="listbox">
                    {curr.links.map((link) => (
                        <li
                            key={link.uuid}
                            className={styles.linkItem}
                            role="option"
                            tabIndex={0}
                            onClick={() => startDownload(link)}
                            onKeyDown={onEnterOrSpace(() => startDownload(link))}
                        >
                            {link.title}
                        </li>
                    ))}
                </ul>
            );

        }

        return null;

    }

    useEffect(() => {
        if (state.status !== 'links-loading') {
            lastRenderable.current = state;
        }
    }, [state]);

    useEffect(() => {

        if (!item.id) return;
        let cancelled = false;

        (async () => {

            const job = await getResourceJob(item.id!);
            if (cancelled || !job || state.status !== 'idle') return;

            const percent = job.progress?.type === 'progress' ? job.progress.percent : 0;
            setState({ status: 'downloading', title: job.label, percent });

            try {
                await pollJobStatus(job.jobId, (event) => {
                    if (cancelled) return;
                    if (event.type === 'progress') {
                        setState({ status: 'downloading', title: job.label, percent: event.percent });
                    }
                });
                if (cancelled) return;
                await completeDownload();
            } catch (e) {
                if (cancelled) return;
                const message = e instanceof Error ? e.message : 'Download failed.';
                setState({ status: 'error', message });
                toast.error(message);
            }

        })();

        return () => { cancelled = true; };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.id]);

    return (
        <article className={styles.storeCard}>

            <div className={[styles.cover, coverLoaded ? styles.loaded : ''].filter(Boolean).join(' ')}>
                <ImageGen
                    src={item.thumbnailUrl || NO_IMAGE_URL}
                    alt={item.title}
                    title={item.title}
                    onLoad={onCoverLoad}
                    onError={onCoverError}
                />
            </div>

            <div className={styles.details}>

                <a href={item.link} target='_blank'>
                    <p className={styles.title} title={item.title}>{item.title}</p>
                </a>

                {item.uploadDate && (
                    <p className={styles.date}>{new Date(item.uploadDate).toLocaleDateString()}</p>
                )}

                <div className={styles.action}>
                    {renderAction(displayState)}
                </div>

            </div>

        </article>
    );

}
