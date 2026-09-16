import { UltraActivity, UltraComponent, ultraQueryParams, ultraState, type UltraLightElement } from "ultra-light-js";
import { createSwapy, type Swapy } from "swapy";
import styles from './library-page.module.css';
import { PageHeader } from "@/components/page-header/page-header";
import { LIBRARY_CONTEXT } from "../context/library.context";
import { FolderCard } from "@/components/folder-card/folder-card";
import { ComicCard } from "@/components/comic-card/comic-card";
import { Layout } from "@/layout";
import { COMICS_TYPE_CTX } from "../context/comics-types.context";
import type { ILibraryResponseItem } from "../library.types";
import { ultraFilters } from "../hooks/ultraFilters";
import { SearchPage } from "./search.page";
import { DOCUMENT_TITLE_CONTEXT } from "../context/document-title.context";
import { matchesReadFilter, READ_TYPES_CTX } from "../context/read-types.context";
import { COMIC_CACHE_CONTEXT } from "../context/comic-cache.context";

export function LibraryPage({
    uid
}: {
    uid?: string
}) {

    const { search } = ultraQueryParams();
    if (search) {
        return SearchPage({ search });
    }
    
    const itemsMap = new Map<string, UltraLightElement>();
    let swapyInstance: Swapy | null = null;

    const [items, setItems, subsItems] = ultraState<ILibraryResponseItem[]>([]);
    
    const { filters, resetFilters, applyFilters } = ultraFilters({ 
        rawItems: getLibraryItems, 
        setItems 
    });
    
    function onLayoutChange(
        $section: HTMLElement
    ){
        $section.classList.toggle(
            styles.detailLayout,
            COMICS_TYPE_CTX.type.get() === 'detail'
        );
    }

    function onItemsChange(
        $section: HTMLElement
    ){

        const currComics = [...items()];
        const currIds = new Set(currComics.map(c => c.uid));

        for (const [uid, node] of itemsMap) {
            if (currIds.has(uid)) continue;
            node._cleanup?.();
            node.remove();
            itemsMap.delete(uid);
        }

        currComics.map(item => {
            if (itemsMap.has(item.uid)) return;
            const card = (item.did)
                ? FolderCard({
                    title: item.name,
                    uid: item.uid
                })
                : ComicCard({
                    item: item
                });
            itemsMap.set(item.uid, UltraComponent({
                component: '<div></div>',
                attributes: { 'data-swapy-slot': item.uid },
                children: [
                    UltraComponent({
                        component: '<div></div>',
                        attributes: { 'data-swapy-item': item.uid },
                        eventHandler: { dragstart: (e) => e.preventDefault() },
                        children: [card]
                    })
                ]
            }))
        })

        currComics.map(c => {
            const $item = itemsMap.get(c.uid);
            if ($item) $section.appendChild($item);
        })

        swapyInstance?.update();

    }

    function getLibraryItems(){
        const items = LIBRARY_CONTEXT.getLibraryItems({ onlyDir: !uid, uid });
        const query = LIBRARY_CONTEXT.searchQuery.get().trim().toLowerCase();
        if (!query) return items;
        return items.filter(item => item.name.toLowerCase().includes(query));
    }

    function hasVisibleItems(){
        const readFilter = READ_TYPES_CTX.type.get();
        return items().some(item => item.did
            || matchesReadFilter(readFilter, COMIC_CACHE_CONTEXT.getCacheById(item.uid)?.readPer || 0));
    }

    return Layout(

        UltraComponent({

            component: '<section></section>',

            className: [styles.page],

            onMount: [() => DOCUMENT_TITLE_CONTEXT.setTitle('Library')],

            children: [

                PageHeader({
                    uid,
                    items,
                    subsItems,
                    filters,
                    resetFilters,
                    showNewFolder: true
                }),

                UltraActivity({
                    mode: {
                        subscriber: [
                            subsItems,
                            LIBRARY_CONTEXT.libraryLoaded.subscribe,
                            READ_TYPES_CTX.type.subscribe,
                            COMIC_CACHE_CONTEXT.cache.subscribe
                        ],
                        state: () => LIBRARY_CONTEXT.libraryLoaded.get() && !hasVisibleItems()
                    },
                    component: `<p class="${styles.empty}">No items to show.</p>`
                }),

                UltraComponent({
                   
                    onMount: [($el: HTMLElement) => {
                        LIBRARY_CONTEXT.fetchLibrary();
                        if (LIBRARY_CONTEXT.groups.get().length) applyFilters();
                        $el.scrollTo(0, 0);
                        swapyInstance = createSwapy($el, { animation: 'dynamic' });
                        swapyInstance.onSwapStart(() => $el.setAttribute('data-dragging', ''));
                        swapyInstance.onSwapEnd(() => $el.removeAttribute('data-dragging'));
                        return () => {
                            swapyInstance?.destroy();
                            swapyInstance = null;
                        };
                    }],

                    component: '<section></section>',
                    className: [styles.comicContainer],
                    trigger: [
                        {
                            subscriber: subsItems,
                            triggerFunction: onItemsChange,
                            defer: true
                        },
                        {
                            subscriber: [
                                COMICS_TYPE_CTX.type.subscribe,
                                subsItems
                            ],
                            triggerFunction: onLayoutChange,
                            defer: true
                        }
                    ]
                })
            ],

            trigger: [{
                subscriber: [
                    LIBRARY_CONTEXT.groups.subscribe,
                    LIBRARY_CONTEXT.searchQuery.subscribe
                ],
                triggerFunction: () => applyFilters()
            }]

        })

    )

}
