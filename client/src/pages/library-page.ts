import { UltraComponent } from "ultra-light.js";
import styles from './library-page.module.css';
import { PageHeader } from "../components/page-header";
import { ultraLibrary } from "../hooks/ultraLibrary";
import { FolderCard } from "../components/folder-card";
import { ComicCard } from "../components/comic-card";
import { Layout } from "../layout";

export function LibraryPage({
    uid
}: {
    uid?: string
}) {

    const { items, subsItems, fetchLibrary } = ultraLibrary({
        onlyDir: !uid,
        uid: uid
    });

    const getComics = async () => {
        await fetchLibrary();
    }

    const onItemsChange = ($section: HTMLElement) => {
        const currComics = [...items()];
        $section.replaceChildren(
            ...currComics.map(comic => {
                return (comic.did)
                    ? FolderCard({
                        title: comic.name,
                        uid: comic.uid
                    })
                    : ComicCard({
                        item: comic,
                        readPer: 0
                    })
            })
        )
    }

    return Layout(
        UltraComponent({
            component: '<section></section>',
            className: [styles.page],
            children: [
                PageHeader({ items, subsItems }),
                UltraComponent({
                    onMount: [getComics],
                    component: '<section></section>',
                    className: [styles.comicContainer],
                    trigger: [{
                        subscriber: subsItems,
                        triggerFunction: onItemsChange
                    }]
                })
            ]
        })
    )
    
}
