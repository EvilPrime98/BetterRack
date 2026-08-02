import { ultraCompState } from "ultra-light-js";
import type { WikiComic } from "better-wiki";

export const COMIC_IDENT_CTX = ultraCompState({
    isVisible: false,
    itemUid: '',
    /** Broadcasts a manual identify pick so the originating ComicCard can update immediately. */
    lastIdentified: null as { uid: string; comic: WikiComic } | null
})