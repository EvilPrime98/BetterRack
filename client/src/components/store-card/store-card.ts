import { UltraComponent, UltraLink, ultraState } from "ultra-light-js";
import styles from './store-card.module.css';
import { ImageGen } from "@/components/image-generic/image-generic";
import { NO_IMAGE_URL } from "@/data";
import { DOWNLOAD_DIR_MODAL_CTX } from "@/context/download-dir-modal.context";
import { LINK_PICKER_MODAL_CTX } from "@/context/link-picker-modal.context";
import { LIBRARY_CONTEXT } from "@/context/library.context";
import { getComicLinks, downloadComicPolling, getResourceJob, pollJobStatus } from "@/services/store.service";
import { toast } from "@/services/toast.service";
import { CheckIcon } from "@/icons/check.icon";
import { STRAT, type IStoreLink, type IStorePost, type TCardState } from "@/store.types";
import { BRButton } from "@/components/br-button/br-button";

export function StoreCard({
    item
}: {
    item: IStorePost
}) {

    const [state, setState, subsState] = ultraState<TCardState>({
        status: 'idle'
    });

    const [coverLoaded, setCoverLoaded, subsCoverLoaded] = ultraState(false);

    async function completeDownload(outputDir?: string) {
        setState({ status: 'done' });
        toast.success(`${item.title} downloaded`);
        await LIBRARY_CONTEXT.refreshLibrary({ silent: true });
        if (outputDir) {
            const folderUid = LIBRARY_CONTEXT.findUidByPath(outputDir);
            if (folderUid) setState({ status: 'done', folderUid });
        }
    }

    async function startDownload(link: IStoreLink) {

        if (!item.id) return;

        const outputDir = await DOWNLOAD_DIR_MODAL_CTX.openDownloadDirModal(link.title);

        if (!outputDir) {
            setState({ status: 'idle' });
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
                    } else if (event.type === 'extracting') {
                        const percent = event.total ? Math.floor((event.done / event.total) * 100) : 0;
                        setState({ status: 'downloading', title: `${link.title} — extracting`, percent });
                    }
                }
            });
            await completeDownload(outputDir);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Download failed.';
            setState({ status: 'error', message });
            toast.error(message);
        }

    }

    async function checkForActiveJob() {

        if (!item.id) return;

        const job = await getResourceJob(item.id);
        if (!job || state().status !== 'idle') return;

        const percent = job.progress?.type === 'progress' ? job.progress.percent : 0;
        setState({ status: 'downloading', title: job.label, percent });

        try {
            await pollJobStatus(job.jobId, job.label, (event) => {
                if (event.type === 'progress') {
                    setState({ status: 'downloading', title: job.label, percent: event.percent });
                } else if (event.type === 'extracting') {
                    const percent = event.total ? Math.floor((event.done / event.total) * 100) : 0;
                    setState({ status: 'downloading', title: `${job.label} — extracting`, percent });
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
                return;
            }

            const chosen = await LINK_PICKER_MODAL_CTX.openLinkPickerModal(links, item.title);

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

    function onCoverError(e: Event) {
        const $img = e.currentTarget as HTMLImageElement;
        if ($img.src === NO_IMAGE_URL) {
            setCoverLoaded(true);
            return;
        }
        $img.src = NO_IMAGE_URL;
    }

    function onActionChange($div: HTMLElement) {

        const curr = state();

        const $button = (
            label: string,
            { 
                disabled = false, 
                loading = false, 
                retry = false 
            }: { 
                disabled?: boolean; 
                loading?: boolean; 
                retry?: boolean 
            } = {}
        ) => {

            return BRButton({
                text: '',
                variant: 'classic',
                className:  retry ? [styles.retryBtn] : [],
                attributes: disabled ? { type: 'button', disabled: 'true' } : { type: 'button' },
                eventHandler: { click: onDownloadClick },
                children: [
                    loading ? `<span class="${styles.spinner}"></span>` : '',
                    `<span>${label}</span>`         
                ]
            })
            
        }

        if (curr.status === 'idle') {

            $div.replaceChildren(
                $button('Download')
            );

        } else if (curr.status === 'downloading') {

            $div.replaceChildren(

                UltraComponent({
                    component: '<div></div>',
                    className: [styles.progressWrap],
                    children: [
                        UltraComponent({
                            component: `<div class="${styles.progress}"><span class="${styles.progressFill}" style="width:${curr.percent}%"></span></div>`,
                            attributes: { 'aria-label': `Downloading ${curr.percent}%` }
                        }),
                        `<span class="${styles.progressPercent}">${curr.percent}%</span>`
                    ]
                })

            );

        } else if (curr.status === 'done') {

            const doneLabel = UltraComponent({
                component: `<span class="${styles.doneLabel}">${CheckIcon({ size: 14 })}Downloaded</span>`
            });

            $div.replaceChildren(

                curr.folderUid
                    ? UltraLink({
                        href: `/${curr.folderUid}`,
                        className: [styles.doneLink],
                        children: [doneLabel, `<span class="${styles.doneLinkLabel}">Go to folder</span>`]
                    })
                    : doneLabel

            );

        } else if (curr.status === 'error') {

            $div.replaceChildren(
                $button('Retry', { retry: true })
            );

        }

    }

    return UltraComponent({

        component: '<article></article>',

        className: [styles.storeCard],

        onMount: [checkForActiveJob],

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.cover],
                trigger: [{
                    subscriber: subsCoverLoaded,
                    triggerFunction: ($div: HTMLElement) => {
                        $div.classList.toggle(styles.loaded, coverLoaded());
                    }
                }],
                children: [
                    ImageGen({
                        attributes: {
                            src: item.thumbnailUrl || NO_IMAGE_URL,
                            alt: item.title,
                            title: item.title
                        },
                        eventHandler: { load: onCoverLoad, error: onCoverError }
                    })
                ]
            }),

            UltraComponent({
                component: '<div></div>',
                className: [styles.details],
                children: [

                    `<p class="${styles.title}" title="${item.title}">${item.title}</p>`,

                    ...(item.uploadDate ? [`<p class="${styles.date}">${new Date(item.uploadDate).toLocaleDateString()}</p>`] : []),

                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.action],
                        onMount: [onActionChange],
                        trigger: [{
                            subscriber: subsState,
                            triggerFunction: onActionChange
                        }]
                    })

                ]
            })

        ]

    })

}
