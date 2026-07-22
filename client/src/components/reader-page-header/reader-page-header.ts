import { UltraComponent } from "ultra-light-js";
import { ArrowLeftIcon } from "../../icons/arrow-left.icon";
import styles from '../../pages/reader.page.module.css'

export function ReaderPageHeader({
    currentPage,
    subsCurrentPage,
    pages,
    subsPages,
    goBack
}:{
    currentPage: () => number;
    subsCurrentPage: (fn: (value: number) => void) => () => void;
    pages: () => string[];
    subsPages: (fn: (value: string[]) => void) => () => void;
    goBack: () => void;
}) {

    const onCounterChange = ($el: HTMLElement) => {
        $el.textContent = `${currentPage()} / ${pages().length}`;
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
                component: `<span>${currentPage()} / ${pages().length}</span>`,
                className: [styles.counter],
                trigger: [
                    { subscriber: subsCurrentPage, triggerFunction: onCounterChange },
                    { subscriber: subsPages, triggerFunction: onCounterChange }
                ]
            }),
        ]
    })

}