import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_URL, reader, readerBookmarks } from '@/services/library.service';
import { withAuthQuery } from '@/services/server-config.service';
import type { IBookmark } from '@/library.types';
import styles from './reader.page.module.css';
import { ImageElement } from '@/components/reader-page-image/reader-page-image';
import { ReaderPageHeader } from '@/components/reader-page-header/reader-page-header';
import { ReaderPageProgressBar } from '@/components/reader-page-progress-bar/reader-page-progress-bar';
import { useComicCacheStore } from '@/stores/comicCache.store';
import { useDocumentTitleStore } from '@/stores/documentTitle.store';
import { ReaderNext } from '@/components/reader-next/reader-next';

const PRELOAD_WINDOW = 2;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +value.toFixed(2)));

function getWindowRange(numPages: number, savedPage: number) {
    if (numPages < 2) return null;
    const targetInd = Math.min(Math.max(savedPage - 1, 1), numPages - 1);
    const start = Math.max(1, targetInd - PRELOAD_WINDOW);
    const end = Math.min(numPages - 1, targetInd + PRELOAD_WINDOW);
    return { targetInd, start, end };
}

async function preloadWindow(uid: string, numPages: number, savedPage: number) {
    const range = getWindowRange(numPages, savedPage);
    if (!range) return;
    const loads: Promise<void>[] = [];
    for (let ind = range.start; ind <= range.end; ++ind) {
        loads.push(new Promise<void>(resolve => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = withAuthQuery(`${API_URL}/read/${uid}/pages/${ind}`);
        }));
    }
    await Promise.all(loads);
}

export function ReaderPage() {

    //hooks
    const { uid } = useParams<{ uid: string }>();
    const navigate = useNavigate();
    const setTitle = useDocumentTitleStore((s) => s.setTitle);

    //states
    const [pages, setPages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [next, setNext] = useState(false);
    const [bookmarks, setBookmarks] = useState<IBookmark[]>([]);

    //refs
    const observerRef = useRef<IntersectionObserver | null>(null);
    const viewerRef = useRef<HTMLElement>(null);
    const pageRef = useRef<HTMLElement>(null);
    const currentPageRef = useRef(currentPage);
    currentPageRef.current = currentPage;
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;

    const goToPage = useCallback((page: number) => {
        const $page = viewerRef.current?.children[page - 1] as HTMLElement | undefined;
        $page?.scrollIntoView({ block: 'start' });
    }, []);

    const goBack = useCallback(() => {
        if (window.history.length > 1) window.history.back();
        else navigate('/');
    }, [navigate]);

    const loadPages = useCallback(async () => {
        if (!uid) return;
        setHasError(false);
        setIsLoading(true);
        try {
            await useComicCacheStore.getState().ready();
            const comicCache = useComicCacheStore.getState().getCacheById(uid);
            const data = await reader({ uid });
            const savedPage = comicCache?.currentPage || 1;
            await preloadWindow(uid, data.length, savedPage);
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
    }, [uid]);

    const zoomIn = useCallback(() => {
        setZoom((z) => clampZoom(z + ZOOM_STEP))
    }, []);

    const zoomOut = useCallback(() => {
        setZoom((z) => clampZoom(z - ZOOM_STEP))
    }, []);
    
    const zoomReset = useCallback(() => {
        setZoom(1)
    }, []);

    const onWheel = useCallback((e: React.WheelEvent) => {
        if (!e.ctrlKey) return;
        // hijack the browser/Electron ctrl+wheel 
        // pinch-zoom and drive our own page zoom instead
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else if (e.deltaY > 0) zoomOut();
    }, [zoomIn, zoomOut]);

    useEffect(() => {
        setTitle('Reader');
    }, [setTitle]);

    useEffect(() => {
        loadPages();
    }, [loadPages]);

    useEffect(() => {
        function onKeydown(e: KeyboardEvent) {
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
        window.addEventListener('keydown', onKeydown);
        return () => {
            window.removeEventListener('keydown', onKeydown);
            observerRef.current?.disconnect();
        };
    }, [goBack, zoomIn, zoomOut, zoomReset]);

    useEffect(() => {
        if (viewerRef.current) viewerRef.current.style.setProperty('--reader-zoom', String(zoom));
    }, [zoom]);

    useEffect(() => {
        const $page = pageRef.current;
        if (!$page) return;

        const pointers = new Map<number, { x: number; y: number }>();
        let startDistance = 0;
        let startZoom = 1;
        let pinching = false;
        let usedTwoPointers = false;
        let lastTapTime = 0;
        let lastTapX = 0;
        let lastTapY = 0;

        const gap = () => {
            const points = Array.from(pointers.values());
            if (points.length < 2) return 0;
            return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        };

        const settle = () => {
            if (pointers.size >= 2) return;
            pinching = false;
            startDistance = 0;
        };

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType === 'mouse') return;
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.size === 2) {
                usedTwoPointers = true;
                pinching = true;
                startDistance = gap();
                startZoom = zoomRef.current;
            }
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!pointers.has(e.pointerId)) return;
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (!pinching || pointers.size < 2) return;
            const current = gap();
            if (startDistance <= 0 || current <= 0) return;
            e.preventDefault();
            setZoom(clampZoom(startZoom * (current / startDistance)));
        };

        const onPointerUp = (e: PointerEvent) => {
            const tracked = pointers.delete(e.pointerId);
            settle();
            if (tracked && e.pointerType === 'touch' && !usedTwoPointers) {
                const now = Date.now();
                const quick = now - lastTapTime < 300;
                const close = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 24;
                if (quick && close) {
                    setZoom(1);
                    lastTapTime = 0;
                } else {
                    lastTapTime = now;
                    lastTapX = e.clientX;
                    lastTapY = e.clientY;
                }
            }
            if (pointers.size === 0) usedTwoPointers = false;
        };

        const onPointerCancel = (e: PointerEvent) => {
            pointers.delete(e.pointerId);
            settle();
            if (pointers.size === 0) usedTwoPointers = false;
        };

        $page.addEventListener('pointerdown', onPointerDown);
        $page.addEventListener('pointermove', onPointerMove, { passive: false });
        $page.addEventListener('pointerup', onPointerUp);
        $page.addEventListener('pointercancel', onPointerCancel);
        return () => {
            $page.removeEventListener('pointerdown', onPointerDown);
            $page.removeEventListener('pointermove', onPointerMove);
            $page.removeEventListener('pointerup', onPointerUp);
            $page.removeEventListener('pointercancel', onPointerCancel);
        };
    }, []);

    useEffect(() => {
        observerRef.current?.disconnect();

        const $section = viewerRef.current;
        if (!uid || !$section || pages.length === 0) return;

        const numPages = pages.length;
        const savedPage = useComicCacheStore.getState().getCacheById(uid)?.currentPage || 1;
        const range = getWindowRange(numPages, savedPage);

        const elements = Array.from($section.children) as HTMLElement[];
        const pageOf = new Map<HTMLElement, number>();
        elements.forEach((el, i) => pageOf.set(el, i + 2));

        const targetEl = range ? elements[range.targetInd - 1] : undefined;
        targetEl?.scrollIntoView({ block: 'start' });

        const observer = new IntersectionObserver((entries) => {
            const mostVisible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (!mostVisible) return;
            const page = pageOf.get(mostVisible.target as HTMLElement);
            if (page) setCurrentPage(page);
        }, { threshold: [0.25, 0.5, 0.75] });

        elements.forEach($page => observer.observe($page));
        observerRef.current = observer;

        return () => observer.disconnect();
        
    }, [pages, uid]);

    useEffect(() => {
        if (!uid || pages.length === 0) return;
        const total = pages.length || 1;
        const per = (currentPage / total) * 100;
        useComicCacheStore.getState().setCacheById(uid, {
            readPer: Number(per.toFixed(2)),
            currentPage: currentPage,
            read: per === 100
        });
    }, [uid, pages, currentPage]);

    useEffect(() => {
        setNext(pages.length > 0 && currentPage === pages.length);
    }, [currentPage, pages.length])

    if (!uid) return null;

    const numPages = pages.length;
    const range = getWindowRange(numPages, currentPageRef.current);

    return (
        <section className={styles.page} onWheel={onWheel} ref={pageRef}>

            <ReaderPageHeader currentPage={currentPage} totalPages={pages.length} bookmarks={bookmarks} goToPage={goToPage} goBack={goBack} />

            <ReaderPageProgressBar currentPage={currentPage} totalPages={pages.length} />

            <div className={styles.state} style={{ display: isLoading ? undefined : 'none' }}>
                <div className={styles.spinner}></div>
                <p>Loading pages…</p>
            </div>

            <div className={styles.state} style={{ display: hasError ? undefined : 'none' }}>
                <p>Something went wrong while loading this comic.</p>
                <button type="button" className={styles.retry} onClick={loadPages}>Retry</button>
            </div>

            <section className={styles.viewer} ref={viewerRef}>
                {Array.from({ length: Math.max(0, numPages - 1) }, (_, i) => i + 1).map(i => (
                    <ImageElement
                        key={i}
                        uid={uid}
                        ind={i}
                        index={i + 1}
                        total={numPages}
                        eager={!!range && i >= range.start && i <= range.end}
                    />
                ))}
            </section>

            { next ? <ReaderNext uid={uid} navigate={navigate}/> : null }

        </section>
    );

}
