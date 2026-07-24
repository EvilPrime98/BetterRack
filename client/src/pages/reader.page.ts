import { UltraActivity, UltraComponent, ultraNavigate, ultraState } from "ultra-light-js"
import { API_URL, reader } from "../services/library.service"
import styles from './reader.page.module.css'
import { ImageElement } from "../components/reader-page-image/reader-page-image";
import { COMIC_CACHE_CONTEXT } from "../context/comic-cache.context";

const PRELOAD_WINDOW = 2;

export function ReaderPage({
    uid
}: {
    uid: string
}) {

    const comicCache = COMIC_CACHE_CONTEXT.getCacheById(uid);
    const [pages, setPages, subsPages] = ultraState<string[]>([]);
    const [isLoading, setIsLoading, subsIsLoading] = ultraState(true);
    const [hasError, setHasError, subsHasError] = ultraState(false);
    const [currentPage, setCurrentPage, subsCurrentPage] = ultraState(comicCache?.currentPage || 1);
    let observer: IntersectionObserver | null = null;

    const goBack = () => {
        if (window.history.length > 1) window.history.back();
        else ultraNavigate({ href: '/' });
    }

    const getWindowRange = (numPages: number, savedPage: number) => {
        if (numPages < 2) return null;
        const targetInd = Math.min(Math.max(savedPage - 1, 1), numPages - 1);
        const start = Math.max(1, targetInd - PRELOAD_WINDOW);
        const end = Math.min(numPages - 1, targetInd + PRELOAD_WINDOW);
        return { targetInd, start, end };
    }

    const preloadWindow = async (numPages: number, savedPage: number) => {
        const range = getWindowRange(numPages, savedPage);
        if (!range) return Promise.resolve();
        const loads: Promise<void>[] = [];
        for (let ind = range.start; ind <= range.end; ++ind) {
            loads.push(new Promise<void>(resolve => {
                const img = new Image();
                img.onload = img.onerror = () => resolve();
                img.src = `${API_URL}/read/${uid}/pages/${ind}`;
            }));
        }
        await Promise.all(loads);
        return undefined;
    }

    const loadPages = async () => {
        setHasError(false);
        setIsLoading(true);
        try {
            const data = await reader({ uid });
            const savedPage = comicCache?.currentPage || 1;
            await preloadWindow(data.length, savedPage);
            setCurrentPage(savedPage);
            setPages(data);
        } catch {
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') goBack();
    }

    const onPagesChange = ($section: HTMLElement) => {

        observer?.disconnect();

        const numPages = pages().length;
        const savedPage = comicCache?.currentPage || 1;
        const range = getWindowRange(numPages, savedPage);
        const pageOf = new Map<HTMLElement, number>();
        const elements = [];
        let $target: HTMLElement | null = null;

        for (let i = 1; i < numPages; ++i) {
            const $page = ImageElement({
                uid, ind: i, index: i + 1, total: numPages,
                eager: !!range && i >= range.start && i <= range.end
            });
            pageOf.set($page, i + 1);
            if (range && i === range.targetInd) $target = $page;
            elements.push($page);
        }

        $section.replaceChildren(...elements);

        $target?.scrollIntoView({ block: 'start' });

        if (!numPages) return;

        observer = new IntersectionObserver((entries) => {
            const mostVisible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (!mostVisible) return;
            const page = pageOf.get(mostVisible.target as HTMLElement);
            if (page) setCurrentPage(page);
        }, { threshold: [0.25, 0.5, 0.75] });

        elements.forEach($page => observer!.observe($page));

    }

    const onProgressChange = () => {
        const total = pages().length || 1;
        const per = (currentPage() / total) * 100;
        COMIC_CACHE_CONTEXT.setCacheById(uid, {
            readPer: Number(per.toFixed(2)),
            currentPage: currentPage(),
            read: per === 100
        });
    }

    return UltraComponent({

        onMount: [
            loadPages,
            () => {
                window.addEventListener('keydown', onKeydown);
                return () => {
                    window.removeEventListener('keydown', onKeydown);
                    observer?.disconnect();
                }
            }
        ],

        component: '<section></section>',

        className: [styles.page],

        children: [

            UltraActivity({
                mode: { state: isLoading, subscriber: subsIsLoading },
                component: '<div></div>',
                className: [styles.state],
                children: [
                    '<div class="' + styles.spinner + '"></div>',
                    '<p>Loading pages…</p>'
                ]
            }),

            UltraActivity({
                mode: { state: hasError, subscriber: subsHasError },
                component: '<div></div>',
                className: [styles.state],
                children: [
                    '<p>Something went wrong while loading this comic.</p>',
                    UltraComponent({
                        component: '<button type="button">Retry</button>',
                        className: [styles.retry],
                        eventHandler: { click: loadPages }
                    })
                ]
            }),

            UltraComponent({
                component: '<section></section>',
                className: [styles.viewer],
                trigger: [{
                    subscriber: subsPages,
                    triggerFunction: onPagesChange
                }]
            })

        ],

        trigger: [
            {
                subscriber: [subsPages, subsCurrentPage],
                triggerFunction: onProgressChange,
                defer: true
            }
        ]

    })

}
