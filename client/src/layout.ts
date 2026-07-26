import { UltraComponent, type UltraRenderableElement } from "ultra-light-js";
import { Header } from "./components/header";
import { SideBar } from "./components/sidebar/sidebar";
import { ComicIdentifier } from "./components/comic-identifier/comic-identifer";

export function Layout(
    ...components: UltraRenderableElement[]
){

    return UltraComponent({
        
        component: '<main></main>',
        
        children: [
            
            Header(),

            SideBar(),
            
            ...components,

            ComicIdentifier()
            
        ]

    })

}