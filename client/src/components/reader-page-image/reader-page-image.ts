import { UltraComponent, ultraState } from "ultra-light-js";
import { API_URL } from "../../services/library.service";
import styles from '../../pages/reader.page.module.css';

export function ImageElement({
    uid,
    ind,
    index,
    total,
    eager
}:{
    uid: string,
    ind: number,
    index: number,
    total: number,
    eager?: boolean
}){

    const [isLoaded, setIsLoaded, subsIsLoaded] = ultraState(false);

    const onLoadedChange = ($wrapper: HTMLElement) => {
        $wrapper.classList.toggle(styles.loaded, isLoaded());
    }

    return UltraComponent({

        component: '<figure></figure>',

        className: [styles.pageWrapper],

        trigger: [{
            subscriber: subsIsLoaded,
            triggerFunction: onLoadedChange
        }],

        children: [
            UltraComponent({
                component: '<img/>',
                attributes: {
                    src: `${API_URL}/read/${uid}/pages/${ind}`,
                    alt: `${uid} — page ${index} of ${total}`,
                    loading: (eager || index <= 2) ? 'eager' : 'lazy'
                },
                eventHandler: {
                    load: () => setIsLoaded(true)
                }
            })
        ]

    })

}