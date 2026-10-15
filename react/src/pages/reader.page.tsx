import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { isDesktopApp } from '@/services/server-config.service';
import { setImmersiveMode } from '@/services/immersive.service';
import styles from './reader.page.module.css';
import { RENDER_AHEAD, RENDER_BEHIND } from '../utils/reader.page.utils';
import { ImageElement } from '@/components/reader-page-image/reader-page-image';
import { ReaderPageHeader } from '@/components/reader-page-header/reader-page-header';
import { ReaderContextMenu } from '@/components/reader-context-menu/reader-context-menu';
import { ReaderPageProgressBar } from '@/components/reader-page-progress-bar/reader-page-progress-bar';
import { useDocumentTitleStore } from '@/stores/documentTitle.store';
import { ReaderNext } from '@/components/reader-next/reader-next';
import { useReaderNavigation } from '@/hooks/useReaderNavigation';
import { useComicPages } from '@/hooks/useComicPages';
import { useReaderPageTracking } from '@/hooks/useReaderPageTracking';
import { useReaderProgress } from '@/hooks/useReaderProgress';
import { useReaderZoom } from '@/hooks/useReaderZoom';
import { useUserPrefStore } from '@/stores/userPref.store';
import type { TReadingMode } from '@/stores/userPref.store';
import { useSettledValue } from '@/hooks/useSettledValue';

const ACTIVE_PAGE_SETTLE_MS = 150;

export function ReaderPage() {

    //hooks
    const { uid } = useParams<{ uid: string }>();
    const setTitle = useDocumentTitleStore((s) => s.setTitle);
    const { navigate, goBack } = useReaderNavigation();
    const { pages, title, isLoading, hasError, bookmarks, isRefreshing, loadPages, refreshComic } = useComicPages(uid);

    //refs
    const viewerRef = useRef<HTMLButtonElement>(null);
    const pageRef = useRef<HTMLElement>(null);

    const { currentPage, isReady, goToPage } = useReaderPageTracking(uid, pages, viewerRef);
    const activePage = useSettledValue(isReady ? currentPage : null, ACTIVE_PAGE_SETTLE_MS);

    const onPageRatio = useCallback((ratio: number) => {
        const $viewer = viewerRef.current;
        if ($viewer && !$viewer.style.getPropertyValue('--page-ratio')) {
            $viewer.style.setProperty('--page-ratio', String(ratio));
        }
    }, []);
    const { onWheel } = useReaderZoom(pageRef, viewerRef);
    useReaderProgress(uid, pages, currentPage);

    const readingMode = useUserPrefStore((s) => s.pref.readingMode);
    const isHorizontal = readingMode === 'horizontal';

    const onReadingModeChange = useCallback((mode: TReadingMode) => {
        useUserPrefStore.getState().setPref({ readingMode: mode });
    }, []);

    const currentPageRef = useRef(currentPage);
    currentPageRef.current = currentPage;
    useLayoutEffect(() => {
        const $page = viewerRef.current?.children[currentPageRef.current - 2] as HTMLElement | undefined;
        $page?.scrollIntoView({ block: 'start', inline: 'start' });
    }, [readingMode]);

    useEffect(() => {
        if (!isHorizontal) return;
        const realign = () => {
            const $page = viewerRef.current?.children[currentPageRef.current - 2] as HTMLElement | undefined;
            $page?.scrollIntoView({ block: 'nearest', inline: 'start' });
        };
        window.addEventListener('resize', realign);
        return () => window.removeEventListener('resize', realign);
    }, [isHorizontal]);

    const onPageWheel = useCallback((e: React.WheelEvent) => {
        onWheel(e);
        if (!isHorizontal || e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        const $figure = (e.target as HTMLElement).closest('figure');
        if ($figure?.hasAttribute('data-splash')) {
            const canScrollX = e.deltaY < 0 ? $figure.scrollLeft > 0
                : $figure.scrollLeft + $figure.clientWidth < $figure.scrollWidth - 1;
            if (canScrollX) {
                $figure.scrollLeft += e.deltaY;
                return;
            }
        }
        const canScrollY = $figure && !$figure.hasAttribute('data-splash')
            && (e.deltaY < 0 ? $figure.scrollTop > 0
                : $figure.scrollTop + $figure.clientHeight < $figure.scrollHeight - 1);
        if (!canScrollY && pageRef.current) pageRef.current.scrollLeft += e.deltaY;
    }, [onWheel, isHorizontal]);

    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    const prevPaddingTop = useRef<number | null>(null);
    useLayoutEffect(() => {
        const $page = pageRef.current;
        if (!$page) return;
        const paddingTop = parseFloat(getComputedStyle($page).paddingTop);
        if (prevPaddingTop.current !== null && !isHorizontal) {
            $page.scrollTop += paddingTop - prevPaddingTop.current;
        }
        prevPaddingTop.current = paddingTop;
    }, [isHeaderVisible, isHorizontal]);

    const toggleHeader = useCallback(() => {
        setIsHeaderVisible(visible => !visible);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (isDesktopApp()) {
            window.desktop?.toggleFullscreen();
            return;
        }
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
    }, []);

    useEffect(() => {
        setImmersiveMode(true);
        return () => setImmersiveMode(false);
    }, []);

    useEffect(() => {
        setTitle('Reader');
    }, [setTitle]);

    if (!uid) return null;

    const numPages = pages.length;
    const next = numPages > 0 && currentPage === numPages;

    return (
        <section className={styles.page} data-mode={readingMode} data-header={isHeaderVisible ? 'visible' : 'hidden'} onWheel={onPageWheel} ref={pageRef}>

            <div className={`${styles.headerOverlay} ${isHeaderVisible ? '' : styles.hidden}`}>
                <ReaderPageHeader title={title} currentPage={currentPage} totalPages={pages.length} bookmarks={bookmarks} isRefreshing={isRefreshing} readingMode={readingMode} onReadingModeChange={onReadingModeChange} goToPage={goToPage} goBack={goBack} onRefresh={refreshComic} />
                <ReaderPageProgressBar currentPage={currentPage} totalPages={pages.length} />
            </div>

            <div className={styles.state} style={{ display: isLoading ? undefined : 'none' }}>
                <div className={styles.spinner}></div>
                <p>Loading pages…</p>
            </div>

            <div className={styles.state} style={{ display: hasError ? undefined : 'none' }}>
                <p>Something went wrong while loading this comic.</p>
                <button type="button" className={styles.retry} onClick={loadPages}>Retry</button>
            </div>

            <button
                className={styles.viewer}
                ref={viewerRef}
                type="button"
                aria-label="Toggle reader header"
                onClick={toggleHeader}
                onDoubleClick={toggleFullscreen}
            >
                {Array.from({ length: Math.max(0, numPages - 1) }, (_, i) => i + 1).map(i => (
                    <ImageElement
                        key={i}
                        uid={uid}
                        ind={i}
                        index={i + 1}
                        total={numPages}
                        active={activePage !== null && i + 1 >= activePage - RENDER_BEHIND && i + 1 <= activePage + RENDER_AHEAD}
                        onRatio={onPageRatio}
                    />
                ))}
            </button>

            { next ? <ReaderNext uid={uid} navigate={navigate}/> : null }

            <ReaderContextMenu currentPage={currentPage} bookmarks={bookmarks} isRefreshing={isRefreshing} readingMode={readingMode} onReadingModeChange={onReadingModeChange} goToPage={goToPage} onRefresh={refreshComic} />

        </section>
    );

}
