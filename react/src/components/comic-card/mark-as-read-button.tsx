import styles from './mark-as-read-button.module.css';
import { useComicCacheStore } from '@/stores/comicCache.store';
import { BookmarkIcon } from '@/icons/bookmark.icon';

export function toggleComicRead(uid: string) {
    const { getCacheById, setCacheById } = useComicCacheStore.getState();
    const currCache = getCacheById(uid);
    const isRead = currCache?.read;
    const newRead = isRead === undefined ? true : !isRead;
    setCacheById(uid, {
        read: newRead,
        readPer: newRead ? 100 : 0
    });
}

export function MarkAsReadButton({
    uid
}: {
    uid: string;
}) {

    const isRead = useComicCacheStore((s) => s.cache[uid]?.read === true);

    const onClick = () => toggleComicRead(uid);

    return (
        <span
            className={[styles.markAsReadButton, isRead ? styles.isRead : ''].filter(Boolean).join(' ')}
            aria-pressed={isRead}
            aria-label={isRead ? 'Mark this comic as unread' : 'Mark this comic as read'}
            onClick={onClick}
        >
            <BookmarkIcon size={16} />
        </span>
    );

}
