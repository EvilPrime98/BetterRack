import { UltraComponent, ultraQueryParams, ultraState, type UltraLightElement } from "ultra-light-js";
import styles from './library-page.module.css';
import { PageHeader } from "@/components/page-header/page-header";
import { LIBRARY_CONTEXT } from "../context/library.context";
import { FolderCard } from "@/components/folder-card/folder-card";
import { ComicCard } from "@/components/comic-card/comic-card";
import { Layout } from "@/layout";
import { COMICS_TYPE_CTX } from "../context/comics-types.context";
import type { ILibraryResponseItem } from "../library.types";
import { ultraFilters } from "../hooks/ultraFilters";
import { applyBackgroundImage } from "../hooks/useBackgroundImage";
import { SearchPage } from "./search.page";
import { DOCUMENT_TITLE_CONTEXT } from "../context/document-title.context";

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

    function onBackgroundChange(
        $section: HTMLElement
    ){
        applyBackgroundImage($section, items(), `library:${uid ?? '__root__'}`);
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
            itemsMap.set(item.uid, (item.did)
                ? FolderCard({
                    title: item.name,
                    uid: item.uid
                })
                : ComicCard({
                    item: item
                })
            )
        })

        currComics.map(c => {
            const $item = itemsMap.get(c.uid);
            if ($item) $section.appendChild($item);
        })

    }

    function getLibraryItems(){
        const items = LIBRARY_CONTEXT.getLibraryItems({ onlyDir: !uid, uid });
        const query = LIBRARY_CONTEXT.searchQuery.get().trim().toLowerCase();
        if (!query) return items;
        return items.filter(item => item.name.toLowerCase().includes(query));
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

                UltraComponent({
                   
                    onMount: [() => {
                        LIBRARY_CONTEXT.fetchLibrary();
                        if (LIBRARY_CONTEXT.groups.get().length) applyFilters();
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

            trigger: [
                {
                    subscriber: [
                        LIBRARY_CONTEXT.groups.subscribe,
                        LIBRARY_CONTEXT.searchQuery.subscribe
                    ],
                    triggerFunction: () => applyFilters()
                },
                {
                    subscriber: subsItems,
                    triggerFunction: onBackgroundChange,
                    defer: true
                }
            ]

        })

    )

}
