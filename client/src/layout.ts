import { UltraComponent, type UltraRenderableElement } from "ultra-light-js";
import { Header } from "@/components/header/header";
import { SideBar } from "./components/sidebar/sidebar";
import { ComicIdentifier } from "./components/comic-identifier/comic-identifer";
import { ConfirmModal } from "./components/confirm-modal/confirm-modal";
import { NewFolderModal } from "./components/new-folder-modal/new-folder-modal";
import { MoveFileModal } from "./components/move-file-modal/move-file-modal";
import { DownloadDirModal } from "./components/download-dir-modal/download-dir-modal";
import { SIDEBAR_CONTEXT } from "@/context/sidebar.context";
import styles from './layout.module.css';

export function Layout(
    ...components: UltraRenderableElement[]
){

    function onCollapsedChange($main: HTMLElement) {
        $main.classList.toggle(styles.sidebarCollapsed, SIDEBAR_CONTEXT.isCollapsed.get());
    }

    // Seed the class before insertion. onCollapsedChange runs one frame later
    // (ultra-light-js defers onMount with requestAnimationFrame), and a route
    // change rebuilds this element. Without the class, .content keeps its full
    // padding-left for one frame and then animates to zero.
    const initialClasses = SIDEBAR_CONTEXT.isCollapsed.get()
        ? [styles.sidebarCollapsed]
        : [];

    return UltraComponent({

        component: '<main></main>',

        className: initialClasses,

        onMount: [onCollapsedChange],

        trigger: [{
            subscriber: SIDEBAR_CONTEXT.isCollapsed.subscribe,
            triggerFunction: onCollapsedChange
        }],

        children: [

            Header(),

            SideBar(),

            UltraComponent({
                component: '<div></div>',
                className: [styles.content],
                children: [...components]
            }),

            ComicIdentifier(),

            ConfirmModal(),

            NewFolderModal(),

            MoveFileModal(),

            DownloadDirModal()

        ]

    })

}
