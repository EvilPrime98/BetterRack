import { UltraComponent, ultraState } from "ultra-light-js";
import { API_URL } from "../../services/library.service";
import { withAuthQuery } from "../../services/server-config.service";
import styles from '../../pages/reader.page.module.css';
import { ImageGen } from "../image-generic/image-generic";

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
    const [isSpread, setIsSpread, subsIsSpread] = ultraState(false);

    const onWrapperClassChange = ($wrapper: HTMLElement) => {
        $wrapper.classList.toggle(styles.loaded, isLoaded());
        $wrapper.classList.toggle(styles.spread, isSpread());
    }

    return UltraComponent({

        component: '<figure></figure>',

        className: [styles.pageWrapper],

        trigger: [
            { subscriber: subsIsLoaded, triggerFunction: onWrapperClassChange },
            { subscriber: subsIsSpread, triggerFunction: onWrapperClassChange }
        ],

        children: [
            ImageGen({
                attributes: {
                    src: withAuthQuery(`${API_URL}/read/${uid}/pages/${ind}`),
                    alt: `${uid} — page ${index} of ${total}`,
                    loading: (eager || index <= 2) ? 'eager' : 'lazy'
                },
                eventHandler: {
                    load: (evt: Event) => {
                        const $img = evt.target as HTMLImageElement;
                        setIsLoaded(true);
                        setIsSpread($img.naturalWidth > $img.naturalHeight);
                    }
                }
            })
        ]

    })

}