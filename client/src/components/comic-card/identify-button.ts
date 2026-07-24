import { UltraComponent } from "ultra-light-js";
import styles from './identify-button.module.css';
import { COMIC_IDENT_CTX } from "../../context/identifer-modal.context";

export function IdentifyButton({
    uid
}: {
    uid: string
}) {

    const onClick = () => {
        COMIC_IDENT_CTX.itemUid.set(uid);
        COMIC_IDENT_CTX.isVisible.set(true);
    }

    return UltraComponent({
        component: '<span></span>',
        className: [styles.identifyButton],
        attributes: {
            type: 'button',
            'aria-label': 'Identify this comic'
        },
        eventHandler: {
            click: onClick
        },
        children: [
            '<span>Identify</span>'
        ]
    })

}
