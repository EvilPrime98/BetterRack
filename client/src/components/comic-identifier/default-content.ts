import { UltraComponent } from "ultra-light-js";
import styles from './comic-identifier.module.css';
import { COMIC_IDENT_CTX } from "../../context/identifer-modal.context";

export function IdentifierDefaultContent({
    isSearching,
    search
}:{
    isSearching: () => boolean;
    search: () => string;
}) {

    const onTextChange = ($p: HTMLElement) => {
        $p.textContent = isSearching()
        ? 'Searching…'
        : search().trim() 
        ? 'No comics found' 
        : `Start typing to search the wiki for item: ${COMIC_IDENT_CTX.itemUid.get()}`    
    }

    return UltraComponent({
        onMount: [onTextChange],
        component: '<p></p>',
        className: [styles.emptyState],
        trigger: [{
            subscriber: COMIC_IDENT_CTX.itemUid.subscribe,
            triggerFunction: onTextChange
        }]
    })
    
}