import { useEffect, useRef, useState } from 'react';
import type { WikiComic } from 'better-wiki';
import styles from './comic-identifier.module.css';
import { SearchIcon } from '../../icons/search.icon';
import { CloseIcon } from '../../icons/close.icon';
import { SuggestionCard } from './suggestion-card';
import { IdentifierDefaultContent } from './default-content';
import { useComicIdentStore } from '@/stores/comicIdent.store';
import { fetchComics } from '../../services/wiki.service';
import { CrButton } from '../cr-button/cr-button';
import { useLibraryStore } from '@/stores/library.store';
import { useConfirmModalStore } from '@/stores/confirmModal.store';

const DEBOUNCING_DELAY = 500;

/**
 * "Identify this comic" modal. Kept always mounted and toggled via inline `display`
 * so the search text/results aren't reset when the modal closes.
 */
export function ComicIdentifier() {

    const isVisible = useComicIdentStore((s) => s.isVisible);

    const [search, setSearch] = useState('');
    const [suggestions, setSuggestions] = useState<WikiComic[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const close = () => useComicIdentStore.getState().setIsVisible(false);

    const onUnidentify = async () => {
        const confirmed = await useConfirmModalStore.getState().confirmDialog({
            title: 'Un-identify comic?',
            message: 'This will remove the identified metadata for this comic.',
            confirmLabel: 'Un-identify'
        });
        if (!confirmed) return;
        const itemUid = useComicIdentStore.getState().itemUid;
        await useLibraryStore.getState().unidentifyFile(itemUid);
        useComicIdentStore.getState().setLastUnidentified({ uid: itemUid });
        close();
    }

    useEffect(() => {

        if (!search.trim()) {
            setSuggestions([]);
            setIsSearching(false);
            return;
        }

        let cancelled = false;

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            const comics = await fetchComics(search, 120);
            if (cancelled) return;
            setSuggestions(comics);
            setIsSearching(false);
        }, DEBOUNCING_DELAY);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };

    }, [search]);

    useEffect(() => {
        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('keydown', onKeydown);
        return () => document.removeEventListener('keydown', onKeydown);
    }, []);

    // Only fires once, at initial mount — not on every modal open (unlike server-modal.tsx's
    // explicit isVisible-driven re-focus).
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <div className={styles.overlay} style={{ display: isVisible ? undefined : 'none' }}>

            <div className={styles.backdrop} onClick={close} />

            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label="Search comics"
            >

                <div className={styles.searchBar}>

                    <SearchIcon size={16} color="#8f8f8f" />

                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search a comic.."
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                    />

                    <CrButton
                        text="Unidentify"
                        variant="red"
                        className={styles.unidentifyButton}
                        aria-label="Un-identify this comic"
                        onClick={onUnidentify}
                    />

                    <span
                        className={styles.closeButton}
                        role="button"
                        aria-label="Close search"
                        onClick={close}
                    >
                        <CloseIcon size={14} />
                    </span>

                </div>

                <section className={styles.suggestions}>
                    {suggestions.length > 0
                        ? suggestions.map((s) => <SuggestionCard key={s.pageId} comic={s} />)
                        : <IdentifierDefaultContent search={search} isSearching={isSearching} />}
                </section>

            </div>

        </div>
    );

}
