import { UltraComponent } from "ultra-light-js";
import styles from './mark-as-read-button.module.css';
import { COMIC_CACHE_CONTEXT } from "@/context/comic-cache.context";
import { toast } from "@/services/toast.service";

export function MarkAsReadButton({
    uid
}: {
    uid: string
}) {

    const getCache = () => COMIC_CACHE_CONTEXT.getCacheById(uid);
    
    const getIsRead = () => (getCache())?.read === true;

    const onButtonStateChange = ($button: HTMLElement) => {
        const isRead = getIsRead();
        $button.classList.toggle(styles.isRead, isRead);
        $button.setAttribute('aria-pressed', String(isRead));
        $button.setAttribute('aria-label', isRead ? 'Mark this comic as unread' : 'Mark this comic as read');
    }

    const onReadStatusChange = ($span: HTMLElement) => {
        $span.textContent = getIsRead()
        ? 'Mark as unread'
        : 'Mark as read'
    }

    const onClick = () => {
        const currCache = getCache();
        const isRead = currCache?.read;
        COMIC_CACHE_CONTEXT.setCacheById(uid, {
            read: isRead === undefined ? true : !isRead,
            readPer: !isRead === true
            ? 0
            : currCache?.readPer
        })
        toast.success(
            !isRead === true
            ? 'Comic marked as read'
            : 'Comic marked as unread'
        );
    }

    return UltraComponent({
        component: '<span></span>',
        className: [styles.markAsReadButton],
        attributes: {
            type: 'button',
            'aria-pressed': String(getIsRead()),
            'aria-label': getIsRead() ? 'Mark this comic as unread' : 'Mark this comic as read'
        },
        eventHandler: {
            click: onClick
        },
        trigger: [{
            subscriber: COMIC_CACHE_CONTEXT.cache.subscribe,
            triggerFunction: onButtonStateChange
        }],
        children: [
            UltraComponent({
                component: '<span></span>',
                onMount: [onReadStatusChange],
                trigger: [{
                    subscriber: COMIC_CACHE_CONTEXT.cache.subscribe,
                    triggerFunction: onReadStatusChange
                }]
            })
        ]
    })

}
