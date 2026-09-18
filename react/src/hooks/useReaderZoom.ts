import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +value.toFixed(2)));

export function useReaderZoom(
    pageRef: RefObject<HTMLElement | null>, 
    viewerRef: RefObject<HTMLElement | null>
) {

    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;

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
    }, [pageRef]);

    return { onWheel };

}
