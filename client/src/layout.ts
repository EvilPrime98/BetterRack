import { UltraComponent, type UltraRenderableElement } from "ultra-light-js";
import { Header } from "./components/header";
import { SideBar } from "./components/sidebar/sidebar";

export function Layout(
    ...components: UltraRenderableElement[]
){

    return UltraComponent({
        
        component: '<main></main>',
        
        children: [
            
            Header(),

            SideBar(),
            
            ...components,

            //Footer()
        ]

    })

}