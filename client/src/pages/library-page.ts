import { UltraComponent, ultraState, type UltraLightElement } from "ultra-light-js";
import styles from './library-page.module.css';
import { PageHeader } from "../components/page-header";
import { LIBRARY_CONTEXT } from "../context/library.context";
import { FolderCard } from "../components/folder-card";
import { ComicCard } from "../components/comic-card/comic-card";
import { Layout } from "../layout";
import { COMICS_TYPE_CTX } from "../context/comics-types.context";
import type { ILibraryResponseItem } from "../library.types";
import { ultraFilters } from "../hooks/ultraFilters";

export function LibraryPage({
    uid
}: {
    uid?: string
}) {

    const [items, setItems, subsItems] = ultraState<ILibraryResponseItem[]>([]);
    const { filters  } = ultraFilters({ rawItems: getLibraryItems, items, setItems });
    const itemsMap = new Map<string, UltraLightElement>();

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

        currComics.map(item => {
            if (itemsMap.has(item.uid)) return;
            console.log('building: ', item.uid);
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
        return LIBRARY_CONTEXT
        .getLibraryItems({ onlyDir: !uid, uid })
    }

    return Layout(

        UltraComponent({

            component: '<section></section>',

            className: [styles.page],

            children: [

                PageHeader({
                    items,
                    subsItems,
                    filters
                }),

                UltraComponent({
                    onMount: [() => {
                        LIBRARY_CONTEXT.fetchLibrary();
                        // on cache hits fetchLibrary won't notify, so hydrate from current state
                        if (LIBRARY_CONTEXT.groups.get().length) setItems(getLibraryItems());
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
                subscriber: LIBRARY_CONTEXT.groups.subscribe,
                triggerFunction: () => setItems(getLibraryItems())
            }]

        })

    )

}
