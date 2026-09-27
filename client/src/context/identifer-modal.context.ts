import { ultraCompState } from "ultra-light-js";
import type { WikiComic } from "better-wiki";
import type { TMetaSource } from "@/library.types";

export const COMIC_IDENT_CTX = ultraCompState({
    isVisible: false,
    itemUid: '',
    /** Broadcasts a fresh identify (manual pick or re-identify) so the originating ComicCard can update immediately. */
    lastIdentified: null as { uid: string; comic: WikiComic; metaSource: TMetaSource } | null,
    /** Broadcasts an un-identify so the originating ComicCard drops its cached comic without an app reload. */
    lastUnidentified: null as { uid: string } | null
})