import { UltraComponent, ultraState } from "ultra-light-js";
import styles from './store-card.module.css';
import { ImageGen } from "@/components/image-generic/image-generic";
import { NO_IMAGE_URL } from "@/data";
import { SETTINGS_CONTEXT } from "@/context/settings.context";
import { getComicLinks, downloadComic } from "@/services/store.service";
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

    function onEnterOrSpace(handler: () => void) {
        return (e: Event) => {
            const key = (e as KeyboardEvent).key;
            if (key !== 'Enter' && key !== ' ') return;
            e.preventDefault();
            handler();
        };
    }

    async function startDownload(link: IStoreLink) {

        const outputDir = SETTINGS_CONTEXT
            .settings
            .get().downloadDir;

        if (!outputDir) {
            const message = 'Set a download folder in Settings before downloading.';
            toast.error(message);
            setState({ status: 'error', message });
            return;
        }

        if (!item.id) return;

        setState({ status: 'downloading', title: link.title, percent: 0 });

        try {
            await downloadComic({
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
            setState({ status: 'done' });
            toast.success(`${item.title} downloaded`);
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

            $div.replaceChildren(

                UltraComponent({
                    component: `<span class="${styles.doneLabel}">${CheckIcon({ size: 14 })}Downloaded</span>`
                })

            );

        } else if (curr.status === 'error') {

            $div.replaceChildren(
                $button('Retry', { retry: true })
            );

        } else if (curr.status === 'links-ready') {

            $div.replaceChildren(

                UltraComponent({
                    component: `<ul class="${styles.linkList}" role="listbox"></ul>`,
                    children: curr.links.map(link => UltraComponent({
                        component: `<li class="${styles.linkItem}">${link.title}</li>`,
                        attributes: {
                            role: 'option',
                            tabindex: '0'
                        },
                        eventHandler: {
                            click: () => startDownload(link),
                            keydown: onEnterOrSpace(() => startDownload(link))
                        }
                    }))
                })

            );

        }

    }

    return UltraComponent({

        component: '<article></article>',

        className: [styles.storeCard],

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
