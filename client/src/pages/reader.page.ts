import { UltraActivity, UltraComponent, ultraNavigate, ultraState } from "ultra-light.js"
import { API_URL, reader } from "../services/library.service"
import { ArrowLeftIcon } from "../icons/arrow-left.icon"
import styles from './reader.page.module.css'

export function ReaderPage({
    uid
}:{
    uid: string
}){

    const [pages, setPages, subsPages] = ultraState<string[]>([]);
    const [isLoading, setIsLoading, subsIsLoading] = ultraState(true);
    const [hasError, setHasError, subsHasError] = ultraState(false);
    const [currentPage, setCurrentPage, subsCurrentPage] = ultraState(1);

    let observer: IntersectionObserver | null = null;

    const goBack = () => {
        if (window.history.length > 1) window.history.back();
        else ultraNavigate({ href: '/' });
    }

    const loadPages = async () => {
        setHasError(false);
        setIsLoading(true);
        try {
            const data = await reader({ uid });
            setCurrentPage(1);
            setPages(data);
        } catch {
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') goBack();
    }

    const onPagesChange = ($section: HTMLElement) => {

        observer?.disconnect();

        const numPages = pages().length;
        const pageOf = new Map<HTMLElement, number>();
        const elements = [];

        for (let i = 0; i < numPages; ++i){
            const $page = ImageElement({ uid, ind: i, index: i + 1, total: numPages });
            pageOf.set($page, i + 1);
            elements.push($page);
        }

        $section.replaceChildren(...elements);

        if (!numPages) return;

        observer = new IntersectionObserver((entries) => {
            const mostVisible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (!mostVisible) return;
            const page = pageOf.get(mostVisible.target as HTMLElement);
            if (page) setCurrentPage(page);
        }, { threshold: [0.25, 0.5, 0.75] });

        elements.forEach($page => observer!.observe($page));

    }

    const onCounterChange = ($el: HTMLElement) => {
        $el.textContent = `${currentPage()} / ${pages().length}`;
    }

    const onProgressChange = ($el: HTMLElement) => {
        const total = pages().length || 1;
        $el.style.width = `${(currentPage() / total) * 100}%`;
    }

    return UltraComponent({

        onMount: [
            loadPages,
            () => {
                window.addEventListener('keydown', onKeydown);
                return () => {
                    window.removeEventListener('keydown', onKeydown);
                    observer?.disconnect();
                }
            }
        ],

        component: '<section></section>',

        className: [styles.page],

        children: [

            UltraComponent({
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
            }),

            UltraComponent({
                component: '<div></div>',
                className: [styles.progressTrack],
                children: [
                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.progressFill],
                        trigger: [
                            { subscriber: subsCurrentPage, triggerFunction: onProgressChange },
                            { subscriber: subsPages, triggerFunction: onProgressChange }
                        ]
                    })
                ]
            }),

            UltraActivity({
                mode: { state: isLoading, subscriber: subsIsLoading },
                component: '<div></div>',
                className: [styles.state],
                children: [
                    '<div class="' + styles.spinner + '"></div>',
                    '<p>Loading pages…</p>'
                ]
            }),

            UltraActivity({
                mode: { state: hasError, subscriber: subsHasError },
                component: '<div></div>',
                className: [styles.state],
                children: [
                    '<p>Something went wrong while loading this comic.</p>',
                    UltraComponent({
                        component: '<button type="button">Retry</button>',
                        className: [styles.retry],
                        eventHandler: { click: loadPages }
                    })
                ]
            }),

            UltraComponent({
                component: '<section></section>',
                className: [styles.viewer],
                trigger: [{
                    subscriber: subsPages,
                    triggerFunction: onPagesChange
                }]
            })

        ]
    })

}

export function ImageElement({
    uid,
    ind,
    index,
    total
}:{
    uid: string,
    ind: number,
    index: number,
    total: number
}){

    const [isLoaded, setIsLoaded, subsIsLoaded] = ultraState(false);

    const onLoadedChange = ($wrapper: HTMLElement) => {
        $wrapper.classList.toggle(styles.loaded, isLoaded());
    }

    return UltraComponent({

        component: '<figure></figure>',

        className: [styles.pageWrapper],

        trigger: [{
            subscriber: subsIsLoaded,
            triggerFunction: onLoadedChange
        }],

        children: [
            UltraComponent({
                component: '<img/>',
                attributes: {
                    src: `${API_URL}/read/${uid}/pages/${ind}`,
                    alt: `${uid} — page ${index} of ${total}`,
                    loading: index <= 2 ? 'eager' : 'lazy'
                },
                eventHandler: {
                    load: () => setIsLoaded(true)
                }
            })
        ]

    })

}
