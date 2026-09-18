import { UltraComponent } from "ultra-light-js";
import { ArrowLeftIcon } from "../../icons/arrow-left.icon";
import { RefreshIcon } from "../../icons/refresh-icon";
import type { IBookmark } from "../../library.types";
import { WindowControls } from "../window-controls/window-controls";
import styles from '../../pages/reader.page.module.css'

export function ReaderPageHeader({
    currentPage,
    subsCurrentPage,
    pages,
    subsPages,
    bookmarks,
    subsBookmarks,
    isRefreshing,
    subsIsRefreshing,
    goToPage,
    goBack,
    onRefresh
}:{
    currentPage: () => number;
    subsCurrentPage: (fn: (value: number) => void) => () => void;
    pages: () => string[];
    subsPages: (fn: (value: string[]) => void) => () => void;
    bookmarks: () => IBookmark[];
    subsBookmarks: (fn: (value: IBookmark[]) => void) => () => void;
    isRefreshing: () => boolean;
    subsIsRefreshing: (fn: (value: boolean) => void) => () => void;
    goToPage: (page: number) => void;
    goBack: () => void;
    onRefresh: () => void;
}) {

    const onRefreshingChange = ($button: HTMLElement) => {
        $button.classList.toggle(styles.spinning, isRefreshing());
    }

    const onCounterChange = ($el: HTMLElement) => {
        $el.textContent = `${currentPage()} / ${pages().length}`;
    }

    const renderBookmarks = ($el: HTMLElement) => {

        const $select = $el as HTMLSelectElement;
        const items = bookmarks();

        $select.replaceChildren();
        $select.hidden = items.length === 0;
        if (!items.length) return;

        const $placeholder = document.createElement('option');
        $placeholder.value = '';
        $placeholder.textContent = 'Jump to bookmark…';
        $select.appendChild($placeholder);

        for (const bookmark of items) {
            const $option = document.createElement('option');
            $option.value = String(bookmark.page);
            $option.textContent = `${bookmark.label} · p.${bookmark.page}`;
            $select.appendChild($option);
        }

    }

    const onBookmarkSelect = (evt: Event) => {
        const $select = evt.target as HTMLSelectElement;
        const page = Number($select.value);
        if (Number.isInteger(page) && page >= 1) goToPage(page);
        $select.value = '';
    }

    return UltraComponent({
        component: '<header></header>',
        className: [styles.toolbar],
        children: [
            UltraComponent({
                component: '<button type="button"></button>',
                className: [styles.back],
                eventHandler: { click: goBack },
                children: [ArrowLeftIcon({ size: 16 }), '<span>Library</span>']
            }),
            UltraComponent({
                component: '<select hidden></select>',
                className: [styles.bookmarks],
                eventHandler: { change: onBookmarkSelect },
                onMount: [renderBookmarks],
                trigger: [
                    { subscriber: subsBookmarks, triggerFunction: renderBookmarks }
                ]
            }),
            UltraComponent({
                component: `<span>${currentPage()} / ${pages().length}</span>`,
                className: [styles.counter],
                trigger: [
                    { subscriber: subsCurrentPage, triggerFunction: onCounterChange },
                    { subscriber: subsPages, triggerFunction: onCounterChange }
                ]
            }),
            UltraComponent({
                component: '<button type="button"></button>',
                className: [styles.refresh],
                attributes: { 'aria-label': 'Refresh scan' },
                eventHandler: { click: onRefresh },
                onMount: [onRefreshingChange],
                children: [RefreshIcon({ size: 16 })],
                trigger: [
                    { subscriber: subsIsRefreshing, triggerFunction: onRefreshingChange }
                ]
            }),
            UltraComponent({
                component: '<div></div>',
                className: [styles.windowControls],
                children: [WindowControls()]
            }),
        ]
    })

}
