import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import styles from './store-card.module.css';
import { ImageGen } from '@/components/image-generic/image-generic';
import { NO_IMAGE_URL } from '@/data';
import { useDownloadDirModalContext } from '@/context/DownloadDirModalContext';
import { useLinkPickerModalContext } from '@/context/LinkPickerModalContext';
import { getComicLinks, startDownloadJob } from '@/services/store.service';
import { toast } from '@/services/toast.service';
import { STRAT, type IStoreLink, type IStorePost, type TCardState } from '@/store.types';
import { BRButton } from '@/components/br-button/br-button';
import { isDesktopApp } from '@/services/server-config.service';

export function StoreCard({
    item
}: {
    item: IStorePost
}) {

    const { openDownloadDirModal } = useDownloadDirModalContext();
    const { openLinkPickerModal } = useLinkPickerModalContext();

    const [state, setState] = useState<TCardState>({ status: 'idle' });
    const [coverLoaded, setCoverLoaded] = useState(false);
    const lastRenderable = useRef<TCardState>(state);
    const displayState = state.status === 'links-loading' ? lastRenderable.current : state;

    async function startDownload(link: IStoreLink) {

        if (!item.id) return;

        const outputDir = await openDownloadDirModal(link.title);

        if (!outputDir) {
            setState({ status: 'idle' });
            return;
        }

        try {
            await startDownloadJob({
                id: item.id,
                title: link.title,
                uuid: link.uuid,
                outputDir,
                strat: STRAT
            });
            setState({ status: 'idle' });
            toast.success('Download in progress');
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
                return;
            }

            const chosen = await openLinkPickerModal(links, item.title);

            if (!chosen) {
                setState({ status: 'idle' });
                return;
            }

            await startDownload(chosen);
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
                <BRButton 
                    text="" onClick={onDownloadClick}
                    variant='classic'
                >
                    <span>Download</span>
                </BRButton>
            );

        }

        if (curr.status === 'error') {

            return (
                <BRButton 
                    text="" 
                    variant='classic'
                    className={styles.retryBtn} 
                    onClick={onDownloadClick}>
                    <span>Retry</span>
                </BRButton>
            );

        }

        return null;

    }

    useEffect(() => {
        if (state.status !== 'links-loading') {
            lastRenderable.current = state;
        }
    }, [state]);

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

                {isDesktopApp() ? (
                    <p className={styles.title} title={item.title}>{item.title}</p>
                ) : (
                    <a href={item.link} target='_blank' rel='noopener noreferrer'>
                        <p className={styles.title} title={item.title}>{item.title}</p>
                    </a>
                )}

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
