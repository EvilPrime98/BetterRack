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

    // ImageGen doesn't forward refs, so this observes the wrapping <a> instead
    // (same box, img fills it via CSS) rather than modifying that shared leaf component.
    const anchorRef = useRef<HTMLAnchorElement>(null);
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
                styles.isRead,
                styles.stackLayer
            ].join(' ')}
            style={{ padding: '0' }}
        >

            <div className={styles.cover}>

                <div className={styles.board} />

                <a ref={anchorRef} className={loaded ? styles.loaded : undefined}>

                    <ImageGen
                        src={src}
                        onLoad={onImageLoad}
                    />

                </a>

                <div className={styles.bagOverlay} />

            </div>

        </article>
    );

}
