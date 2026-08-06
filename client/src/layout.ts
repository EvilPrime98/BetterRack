import { UltraComponent, type UltraRenderableElement } from "ultra-light-js";
import { Header } from "@/components/header/header";
import { SideBar } from "./components/sidebar/sidebar";
import { ComicIdentifier } from "./components/comic-identifier/comic-identifer";
import { ConfirmModal } from "./components/confirm-modal/confirm-modal";
import { NewFolderModal } from "./components/new-folder-modal/new-folder-modal";
import { FolderPrefsModal } from "./components/folder-prefs-modal/folder-prefs-modal";
import { MoveFileModal } from "./components/move-file-modal/move-file-modal";

export function Layout(
    ...components: UltraRenderableElement[]
){

    return UltraComponent({
        
        component: '<main></main>',
        
        children: [
            
            Header(),

            SideBar(),
            
            ...components,

            ComicIdentifier(),

            ConfirmModal(),

            NewFolderModal(),

            FolderPrefsModal(),

            MoveFileModal()

        ]

    })

}