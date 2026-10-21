import { UltraComponent } from "ultra-light-js";
import { API_URL } from "../../services/library.service";
import { withAuthQuery } from "../../services/server-config.service";
import styles from '../../pages/reader.page.module.css';
import { ImageGen } from "../image-generic/image-generic";

export function ImageElement({
    uid,
    ind,
    index,
    total,
    onRatio
}:{
    uid: string,
    ind: number,
    index: number,
    total: number,
    onRatio: (ratio: number) => void
}){

    let $img: HTMLElement | null = null;

    const $figure = UltraComponent({
        component: '<figure></figure>',
        className: [styles.pageWrapper, styles.idle]
    });

    const onLoad = (evt: Event) => {
        const { naturalWidth, naturalHeight } = evt.target as HTMLImageElement;
        if (naturalWidth > 0 && naturalHeight > 0) {
            const measured = naturalWidth / naturalHeight;
            $figure.style.aspectRatio = String(measured);
            onRatio(measured);
        }
        $figure.classList.add(styles.loaded);
    }

    const setActive = (active: boolean) => {
        $figure.classList.toggle(styles.idle, !active);
        if (active === ($img !== null)) return;
        if (active) {
            $img = ImageGen({
                attributes: {
                    src: withAuthQuery(`${API_URL}/read/${uid}/pages/${ind}`),
                    alt: `${uid} — page ${index} of ${total}`,
                    loading: 'eager'
                },
                eventHandler: { load: onLoad }
            });
            $figure.replaceChildren($img);
        } else {
            $img?.remove();
            $img = null;
            $figure.classList.remove(styles.loaded);
        }
    }

    return { element: $figure, setActive };

}
