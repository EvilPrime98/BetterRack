import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useUserPrefStore } from '../stores/userPref.store';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const PAGE_BASE_WIDTH = 900;

const maxZoomFor = (viewerWidth: number) =>
    Math.max(1, Math.floor(Math.min(MAX_ZOOM, viewerWidth / PAGE_BASE_WIDTH) * 100) / 100);

const clampZoom = (value: number, maxZoom: number) => Math.min(maxZoom, Math.max(MIN_ZOOM, +value.toFixed(2)));

export function useReaderZoom(
    pageRef: RefObject<HTMLElement | null>,
    viewerRef: RefObject<HTMLDivElement | null>
) {

    const [zoom, setZoom] = useState(() => useUserPrefStore.getState().getPref('zoom'));
    const zoomRef = useRef(zoom);
    useLayoutEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    const persistZoom = useCallback((value: number) => {
        useUserPrefStore.getState().setPref({ zoom: value });
    }, []);

    const currentMaxZoom = useCallback(() => {
        const width = viewerRef.current?.clientWidth ?? 0;
        return width > 0 ? maxZoomFor(width) : MAX_ZOOM;
    }, [viewerRef]);

    const clamp = useCallback((value: number) => clampZoom(value, currentMaxZoom()), [currentMaxZoom]);

    const zoomIn = useCallback(() => {
        const next = clamp(zoomRef.current + ZOOM_STEP);
        setZoom(next);
        persistZoom(next);
    }, [clamp, persistZoom]);

    const zoomOut = useCallback(() => {
        const next = clamp(zoomRef.current - ZOOM_STEP);
        setZoom(next);
        persistZoom(next);
    }, [clamp, persistZoom]);

    const zoomReset = useCallback(() => {
        setZoom(1);
        persistZoom(1);
    }, [persistZoom]);

    const onWheel = useCallback((e: React.WheelEvent) => {
        if (!e.ctrlKey) return;
        // hijack the browser/Electron ctrl+wheel
        // pinch-zoom and drive our own page zoom instead
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else if (e.deltaY > 0) zoomOut();
    }, [zoomIn, zoomOut]);

    useEffect(() => {
        function onKeydown(e: KeyboardEvent) {
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
        return () => window.removeEventListener('keydown', onKeydown);
    }, [zoomIn, zoomOut, zoomReset]);

    useEffect(() => {
        if (viewerRef.current) viewerRef.current.style.setProperty('--reader-zoom', String(zoom));
    }, [zoom, viewerRef]);

    useEffect(() => {
        const fitZoom = () => {
            const limit = currentMaxZoom();
            if (zoomRef.current <= limit) return;
            setZoom(limit);
            persistZoom(limit);
        };
        fitZoom();
        window.addEventListener('resize', fitZoom);
        return () => window.removeEventListener('resize', fitZoom);
    }, [currentMaxZoom, persistZoom]);

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
            if (pinching) persistZoom(zoomRef.current);
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
            setZoom(clamp(startZoom * (current / startDistance)));
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
                    persistZoom(1);
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
    }, [pageRef, clamp, persistZoom]);

    return { onWheel };

}
