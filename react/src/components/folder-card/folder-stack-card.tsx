import { useEffect, useRef, useState } from 'react';
import { ImageGen } from "../image-generic/image-generic";
import styles from '../comic-card/comic-card.module.css';
import { wikiImageOptimizer } from "@/services/wiki.service";

export function FolderStackCard({
    cover
}: {
    cover: string;
    isRead: boolean;
}) {

    const RESIZE_DEBOUNCE_MS = 200;
    const anchorRef = useRef<HTMLDivElement>(null);
    const [src, setSrc] = useState(cover);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {

        const $anchor = anchorRef.current;
        if (!$anchor) return;

        let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

        const resizeObserver = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            if (!width) return;

            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                setSrc(wikiImageOptimizer(cover, width));
            }, RESIZE_DEBOUNCE_MS);
        });

        resizeObserver.observe($anchor);

        return () => {
            resizeObserver.disconnect();
            if (resizeTimeout) clearTimeout(resizeTimeout);
        };

    }, [cover]);

    const onImageLoad = () => setLoaded(true);

    return (
        <article
            className={[
                styles.comicCard,
                styles.stackLayer
            ].join(' ')}
            style={{ padding: '0' }}
        >

            <div className={styles.cover}>

                <div className={styles.board} />

                <div ref={anchorRef} className={[styles.frame, loaded ? styles.loaded : ''].filter(Boolean).join(' ')}>

                    <ImageGen
                        src={src}
                        onLoad={onImageLoad}
                    />

                </div>

                <div className={styles.bagOverlay} />

            </div>

        </article>
    );

}
