import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { isDesktopApp } from '@/services/server-config.service';
import styles from './reader.page.module.css';
import { getWindowRange } from '../utils/reader.page.utils';
import { ImageElement } from '@/components/reader-page-image/reader-page-image';
import { ReaderPageHeader } from '@/components/reader-page-header/reader-page-header';
import { ReaderPageProgressBar } from '@/components/reader-page-progress-bar/reader-page-progress-bar';
import { useDocumentTitleStore } from '@/stores/documentTitle.store';
import { ReaderNext } from '@/components/reader-next/reader-next';
import { useReaderNavigation } from '@/hooks/useReaderNavigation';
import { useComicPages } from '@/hooks/useComicPages';
import { useReaderPageTracking } from '@/hooks/useReaderPageTracking';
import { useReaderProgress } from '@/hooks/useReaderProgress';
import { useReaderZoom } from '@/hooks/useReaderZoom';

export function ReaderPage() {

    //hooks
    const { uid } = useParams<{ uid: string }>();
    const setTitle = useDocumentTitleStore((s) => s.setTitle);
    const { navigate, goBack } = useReaderNavigation();
    const { pages, isLoading, hasError, bookmarks, isRefreshing, loadPages, refreshComic } = useComicPages(uid);

    //refs
    const viewerRef = useRef<HTMLDivElement>(null);
    const pageRef = useRef<HTMLElement>(null);

    const { currentPage, goToPage } = useReaderPageTracking(uid, pages, viewerRef);
    const { onWheel } = useReaderZoom(pageRef, viewerRef);
    useReaderProgress(uid, pages, currentPage);

    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

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
        setTitle('Reader');
    }, [setTitle]);

    if (!uid) return null;

    const numPages = pages.length;
    const range = getWindowRange(numPages, currentPage);
    const next = numPages > 0 && currentPage === numPages;

    return (
        <section className={styles.page} onWheel={onWheel} ref={pageRef}>

            <div className={`${styles.headerOverlay} ${isHeaderVisible ? '' : styles.hidden}`}>
                <ReaderPageHeader currentPage={currentPage} totalPages={pages.length} bookmarks={bookmarks} isRefreshing={isRefreshing} goToPage={goToPage} goBack={goBack} onRefresh={refreshComic} />
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

            <div
                className={styles.viewer}
                ref={viewerRef}
                role="button"
                tabIndex={0}
                aria-label="Toggle reader header"
                onClick={toggleHeader}
                onDoubleClick={toggleFullscreen}
                onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    toggleHeader();
                }}
            >
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
            </div>

            { next ? <ReaderNext uid={uid} navigate={navigate}/> : null }

        </section>
    );

}
