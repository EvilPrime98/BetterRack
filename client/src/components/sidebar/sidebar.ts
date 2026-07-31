import { UltraComponent, ultraState } from "ultra-light-js";
import styles from './sidebar.module.css';
import { SIDEBAR_CONTEXT } from "../../context/sidebar.context";
import { LIBRARY_CONTEXT } from "../../context/library.context";
import { SideBarGroup } from "./sidebar-group";
import type { ILibraryGroup } from "../../library.types";
import { RefreshLibraryButton } from "./refresh-button";
import { SidebarCloseButton } from "./close-button";
import { SidebarSearch } from "./sidebar-search";

export function SideBar() {

    const [ items,setItems,subsItems] = ultraState<ILibraryGroup[]>([]);

    function fetchLibrary() {
        LIBRARY_CONTEXT.fetchLibrary();
        if (LIBRARY_CONTEXT.groups.get().length) {
            setItems(LIBRARY_CONTEXT.groups.get());
        }
    };
        
    function closeSidebar(){ SIDEBAR_CONTEXT.isExpanded.set(false) };

    function onExpandChange($aside: HTMLElement){
        const isExpanded = SIDEBAR_CONTEXT.isExpanded.get();
        $aside.classList.toggle(styles.expanded, isExpanded);
        if (isExpanded) {
            $aside.removeAttribute('inert');
        } else {
            if ($aside.contains(document.activeElement)) {
                (document.activeElement as HTMLElement).blur();
            }
            $aside.setAttribute('inert', '');
        }
    }

    function onBackdropChange($backdrop: HTMLElement){
        $backdrop.classList.toggle(styles.visible, SIDEBAR_CONTEXT.isExpanded.get());
    }

    function onItemsChange($nav: HTMLElement){
        const currItems = [...items()];
        if (!currItems.length) {
            $nav.replaceChildren(
                UltraComponent({
                    component: `<p>${LIBRARY_CONTEXT.queryClient.get().isFetching() ? 'Loading library…' : 'No folders found'}</p>`,
                    className: [styles.emptyState]
                })
            );
        } else {
            $nav.replaceChildren(
                ...currItems.map(group => {
                    return SideBarGroup({ group })
                })
            )
        }
    }

    function onKeydown(event: KeyboardEvent){
        if (event.key === 'Escape') closeSidebar();
    }

    return UltraComponent({

        component: '<div></div>',

        children: [

            UltraComponent({
                component: '<div></div>',
                className: [styles.backdrop],
                eventHandler: { click: closeSidebar },
                trigger: [{
                    subscriber: SIDEBAR_CONTEXT.isExpanded.subscribe,
                    triggerFunction: onBackdropChange
                }]
            }),

            UltraComponent({
                
                onMount: [
                    onExpandChange,
                    fetchLibrary,
                    () => {
                        document.addEventListener('keydown', onKeydown);
                        return () => document.removeEventListener('keydown', onKeydown);
                    }
                ],
                
                component: '<aside></aside>',

                attributes: {
                    role: 'navigation',
                    'aria-label': 'Library folders'
                },
                
                className: [styles.sideBar],
                
                children: [

                    UltraComponent({                        
                        component: '<div></div>',                       
                        className: [styles.header],                     
                        children: [                          
                            `<span class="${styles.title}">Library</span>`,                           
                            UltraComponent({                               
                                component: '<div></div>',                              
                                styles: {
                                    display: 'flex',
                                    gap: '10px'
                                },
                                children: [                                
                                    SidebarCloseButton()
                                ]
                            })
                        ]
                    }),

                    SidebarSearch(),

                    RefreshLibraryButton(),
                    
                    UltraComponent({
                        onMount: [onItemsChange],
                        component: '<nav></nav>',
                        className: [styles.list],
                        trigger: [{
                            subscriber: subsItems,
                            triggerFunction: onItemsChange
                        }]
                    })

                ],

                trigger: [
                    {
                        subscriber: SIDEBAR_CONTEXT.isExpanded.subscribe,
                        triggerFunction: onExpandChange
                    }
                ]
            })

        ],

        trigger: [{
            subscriber: LIBRARY_CONTEXT.groups.subscribe,
            triggerFunction: () =>{
                setItems(LIBRARY_CONTEXT.groups.get())
            }
        }]

    })

}
