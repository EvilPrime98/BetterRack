import { UltraComponent } from "ultra-light.js";
import styles from './folder-card.module.css';
import { NO_IMAGE_URL } from "../data";
import { UltraLink } from "ultra-light.js";

export function FolderCard({
    title,
    uid
}:{
    title: string,
    uid: string
}) {

    return UltraComponent({

        component: '<article></article>',

        className: [styles.comicCard],

        children: [

            UltraLink({
                href: `/${uid}`,
                children: [
                    UltraComponent({
                        component: '<div></div>',
                        className: [styles.cover],
                        children: [
                            UltraComponent({
                                component: `<img/>`,
                                attributes: {
                                    src: NO_IMAGE_URL,
                                    alt: title
                                }
                            })
                        ]
                    }),
                ]
            }),


            `<p class="${styles.title}">${title}</p>`,

        ]

    })

}
