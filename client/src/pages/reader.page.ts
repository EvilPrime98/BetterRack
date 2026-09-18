import { UltraActivity, UltraComponent, ultraNavigate, ultraState } from "ultra-light-js"
import { API_URL, reader, readerBookmarks, readerRefresh } from "../services/library.service"
import { withAuthQuery } from "../services/server-config.service"
import type { IBookmark } from "../library.types"
import styles from './reader.page.module.css'
import { ImageElement } from "../components/reader-page-image/reader-page-image";
import { ReaderPageHeader } from "../components/reader-page-header/reader-page-header";
import { ReaderPageProgressBar } from "../components/reader-page-progress-bar/reader-page-progress-bar";
import { COMIC_CACHE_CONTEXT } from "../context/comic-cache.context";
import { DOCUMENT_TITLE_CONTEXT } from "../context/document-title.context";

const PRELOAD_WINDOW = 2;

// Rolling prefetch band around the active page. It is forward-biased so a
// continuous read keeps landing on pages that are already in the browser cache.
const PREFETCH_AHEAD = 4;
const PREFETCH_BEHIND = 1;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export function ReaderPage({
    uid
}: {
    uid: string
}) {

    let comicCache = COMIC_CACHE_CONTEXT.getCacheById(uid);
    const [pages, setPages, subsPages] = ultraState<string[]>([]);
    const [isLoading, setIsLoading, subsIsLoading] = ultraState(true);
    const [hasError, setHasError, subsHasError] = ultraState(false);
    const [currentPage, setCurrentPage, subsCurrentPage] = ultraState(comicCache?.currentPage || 1);
    const [zoom, setZoom, subsZoom] = ultraState(1);
    const [bookmarks, setBookmarks, subsBookmarks] = ultraState<IBookmark[]>([]);
    const [isRefreshing, setIsRefreshing, subsIsRefreshing] = ultraState(false);
    const [isHeaderVisible, setIsHeaderVisible, subsIsHeaderVisible] = ultraState(true);
    let observer: IntersectionObserver | null = null;
    let viewer: HTMLElement | null = null;

    const activePointers = new Map<number, { x: number; y: number }>();
    let pinchStartDistance = 0;
    let pinchStartZoom = 1;
    let isPinching = false;
    let gestureUsedTwoPointers = false;
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    // 1-based page numbers already handed to an Image(). loadPages() clears it
    // for a fresh comic. The browser cache holds the bytes after that.
    const requested = new Set<number>();

    // Warm the in-range pages that are not yet requested. The returned promise
    // settles when they all load or fail. Fire-and-forget callers ignore it.
    const warmPages = (numPages: number, pageNumbers: number[]): Promise<void> => {
        const fresh = pageNumbers.filter(
            page => page >= 1 && page <= numPages && !requested.has(page)
        );
        if (!fresh.length) return Promise.resolve();
        const loads = fresh.map(page => new Promise<void>(resolve => {
            requested.add(page);
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = withAuthQuery(`${API_URL}/read/${uid}/pages/${page}`);
        }));
        return Promise.all(loads).then(() => undefined);
    }

    const prefetchAround = (page: number) => {
        const numPages = pages().length;
        if (!numPages) return;
        const targets: number[] = [];
        for (let p = page + 1; p <= page + PREFETCH_AHEAD; ++p) targets.push(p);
        for (let p = page - PREFETCH_BEHIND; p < page; ++p) targets.push(p);
        void warmPages(numPages, targets);
    }

    const goToPage = (page: number) => {
        const $page = viewer?.children[page - 1] as HTMLElement | undefined;
        $page?.scrollIntoView({ block: 'start' });
        prefetchAround(page);
    }

    const goBack = () => {
        if (window.history.length > 1) window.history.back();
        else ultraNavigate({ href: '/' });
    }

    const getWindowRange = (numPages: number, savedPage: number) => {
        if (numPages < 1) return null;
        const targetInd = Math.min(Math.max(savedPage - 1, 0), numPages - 1);
        const start = Math.max(0, targetInd - PRELOAD_WINDOW);
        const end = Math.min(numPages - 1, targetInd + PRELOAD_WINDOW);
        return { targetInd, start, end };
    }

    const preloadWindow = (numPages: number, savedPage: number): Promise<void> => {
        const range = getWindowRange(numPages, savedPage);
        if (!range) return Promise.resolve();
        const pageNumbers: number[] = [];
        for (let ind = range.start; ind <= range.end; ++ind) pageNumbers.push(ind + 1);
        return warmPages(numPages, pageNumbers);
    }

    const loadPages = async () => {
        setHasError(false);
        setIsLoading(true);
        requested.clear();
        try {
            await COMIC_CACHE_CONTEXT.ready();
            comicCache = COMIC_CACHE_CONTEXT.getCacheById(uid);
            const data = await reader({ uid });
            const savedPage = comicCache?.currentPage || 1;
            await preloadWindow(data.length, savedPage);
            setCurrentPage(savedPage);
            setPages(data);
            // Bookmarks are optional comic metadata. A failure here must not
            // stop the reader from opening.
            try {
                setBookmarks(await readerBookmarks({ uid }));
            } catch {
                setBookmarks([]);
            }
        } catch {
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }

    const refreshComic = async () => {
        if (isRefreshing()) return;
        setIsRefreshing(true);
        setHasError(false);
        requested.clear();
        try {
            const data = await readerRefresh({ uid });
            setPages(data);
            try {
                setBookmarks(await readerBookmarks({ uid }));
            } catch {
                setBookmarks([]);
            }
        } catch {
            setHasError(true);
        } finally {
            setIsRefreshing(false);
        }
    }

    const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +value.toFixed(2)));

    const zoomIn = () => setZoom(clampZoom(zoom() + ZOOM_STEP));
    const zoomOut = () => setZoom(clampZoom(zoom() - ZOOM_STEP));
    const zoomReset = () => setZoom(1);

    const toggleHeader = () => setIsHeaderVisible(!isHeaderVisible());

    const onHeaderVisibilityChange = ($header: HTMLElement) => {
        $header.classList.toggle(styles.hidden, !isHeaderVisible());
    }

    const toggleFullscreen = () => {
        if (window.desktop?.toggleFullscreen) {
            window.desktop.toggleFullscreen();
            return;
        }
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
    }

    const pointerGap = () => {
        const points = [...activePointers.values()];
        if (points.length < 2) return 0;
        return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    }

    const settlePinch = () => {
        if (activePointers.size >= 2) return;
        isPinching = false;
        pinchStartDistance = 0;
    }

    const onPointerDown = (evt: Event) => {
        const e = evt as PointerEvent;
        if (e.pointerType === 'mouse') return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.size === 2) {
            gestureUsedTwoPointers = true;
            isPinching = true;
            pinchStartDistance = pointerGap();
            pinchStartZoom = zoom();
        }
    }

    const onPointerMove = (evt: Event) => {
        const e = evt as PointerEvent;
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (!isPinching || activePointers.size < 2) return;
        const gap = pointerGap();
        if (pinchStartDistance <= 0 || gap <= 0) return;
        e.preventDefault();
        setZoom(clampZoom(pinchStartZoom * (gap / pinchStartDistance)));
    }

    const onPointerUp = (evt: Event) => {
        const e = evt as PointerEvent;
        const tracked = activePointers.delete(e.pointerId);
        settlePinch();
        if (tracked && e.pointerType === 'touch' && !gestureUsedTwoPointers) {
            const now = Date.now();
            const quick = now - lastTapTime < 300;
            const close = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 24;
            if (quick && close) {
                zoomReset();
                lastTapTime = 0;
            } else {
                lastTapTime = now;
                lastTapX = e.clientX;
                lastTapY = e.clientY;
            }
        }
        if (activePointers.size === 0) gestureUsedTwoPointers = false;
    }

    const onPointerCancel = (evt: Event) => {
        const e = evt as PointerEvent;
        activePointers.delete(e.pointerId);
        settlePinch();
        if (activePointers.size === 0) gestureUsedTwoPointers = false;
    }

    const onZoomChange = ($viewer: HTMLElement) => {
        $viewer.style.setProperty('--reader-zoom', String(zoom()));
    }

    const onWheel = (evt: Event) => {
        const e = evt as WheelEvent;
        if (!e.ctrlKey) return;
        // hijack the browser/Electron ctrl+wheel pinch-zoom and drive our own page zoom instead
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else if (e.deltaY > 0) zoomOut();
    }

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            goBack();
            return;
        }
        if (!e.ctrlKey) return;
        // hijack the browser/Electron page-zoom shortcuts and drive our own page zoom instead
        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
            e.preventDefault();
            zoomIn();
        } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
            e.preventDefault();
            zoomOut();
        } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
            e.preventDefault();
            zoomReset();
        }
    }

    const onPagesChange = ($section: HTMLElement) => {

        observer?.disconnect();
        viewer = $section;

        const numPages = pages().length;
        const savedPage = comicCache?.currentPage || 1;
        const range = getWindowRange(numPages, savedPage);
        const pageOf = new Map<HTMLElement, number>();
        const elements = [];
        let $target: HTMLElement | null = null;

        for (let i = 0; i < numPages; ++i) {
            const $page = ImageElement({
                uid, ind: i + 1, index: i + 1, total: numPages,
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
            if (page) {
                setCurrentPage(page);
                prefetchAround(page);
            }
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
            () => DOCUMENT_TITLE_CONTEXT.setTitle('Reader'),
            () => {
                window.addEventListener('keydown', onKeydown);
                return () => {
                    window.removeEventListener('keydown', onKeydown);
                    observer?.disconnect();
                }
            },
            ($page: HTMLElement) => {
                $page.addEventListener('pointerdown', onPointerDown);
                $page.addEventListener('pointermove', onPointerMove, { passive: false });
                $page.addEventListener('pointerup', onPointerUp);
                $page.addEventListener('pointercancel', onPointerCancel);
                return () => {
                    $page.removeEventListener('pointerdown', onPointerDown);
                    $page.removeEventListener('pointermove', onPointerMove);
                    $page.removeEventListener('pointerup', onPointerUp);
                    $page.removeEventListener('pointercancel', onPointerCancel);
                }
            }
        ],

        component: '<section></section>',

        className: [styles.page],

        eventHandler: {
            wheel: onWheel
        },

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.headerOverlay],
                trigger: [
                    {
                        subscriber: subsIsHeaderVisible,
                        triggerFunction: onHeaderVisibilityChange
                    }
                ],
                children: [

                    ReaderPageHeader({
                        currentPage, subsCurrentPage,
                        pages, subsPages,
                        bookmarks, subsBookmarks,
                        isRefreshing, subsIsRefreshing,
                        goToPage,
                        goBack,
                        onRefresh: refreshComic
                    }),

                    ReaderPageProgressBar({
                        currentPage, subsCurrentPage,
                        pages, subsPages
                    })

                ]
            }),

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
                onMount: [onZoomChange],
                eventHandler: {
                    click: toggleHeader,
                    dblclick: toggleFullscreen
                },
                trigger: [
                    {
                        subscriber: subsPages,
                        triggerFunction: onPagesChange
                    },
                    {
                        subscriber: subsZoom,
                        triggerFunction: onZoomChange
                    }
                ]
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
