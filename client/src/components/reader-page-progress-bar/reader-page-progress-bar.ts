import { UltraComponent } from "ultra-light-js";
import styles from '../../pages/reader.page.module.css';
import { COMIC_CACHE_CONTEXT } from "../../context/comic-cache.context";

export function ReaderPageProgressBar({
    uid,
    subsCurrentPage,
    subsPages,
    pages,
    currentPage
}: {
    uid: string;
    currentPage: () => number;
    subsCurrentPage: (fn: (value: number) => void) => () => void;
    pages: () => string[];
    subsPages: (fn: (value: string[]) => void) => () => void
}) {

    const onProgressChange = ($el: HTMLElement) => {
        const total = pages().length || 1;
        const per = (currentPage() / total) * 100;
        COMIC_CACHE_CONTEXT.setCacheById(uid, { readPer: per });
        $el.style.width = `${per}%`;
    }

    return UltraComponent({
        component: '<div></div>',
        className: [styles.progressTrack],
        children: [
            UltraComponent({
                component: '<div></div>',
                className: [styles.progressFill],
                trigger: [
                    {
                        subscriber: [subsPages, subsCurrentPage],
                        triggerFunction: onProgressChange,
                        defer: true
                    }
                ]
            })
        ]
    })

}