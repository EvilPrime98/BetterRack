import type { WikiComic } from "better-wiki";
import { ultraQuery, ultraState } from "ultra-light-js";
import { getComicPref } from "../services/library.service";
import type { ILibraryItemPref } from "../library.types";
import { fetchComic, fetchComicById } from "../services/wiki.service";

export const ultraComicQueryClient = ultraQuery();

export function ultraComic() {

    const [comic, setComic, subsComic] = ultraState<WikiComic|null>(null);

    const getComic = async (title: string) => {
        const { data } = await ultraComicQueryClient.fetch(
            `comic:${title}`,
            () => fetchComic(title),
            60 * 5 * 1000
        ) as { data: WikiComic | null };
        setComic(data);
    }

    const getComicById = async (id: number) => {
        const { data } = await ultraComicQueryClient.fetch(
            `wiki-comic-${id}`,
            () => fetchComicById(id),
            60 * 5 * 1000
        ) as { data: WikiComic | null };
        setComic(data);
    }

    const getPref = async (uid: string) => {
        const { data } = await ultraComicQueryClient.fetch(
            `comic-pref-${uid}`,
            () => getComicPref(uid),
            60 * 5 * 1000
        ) as  { data: ILibraryItemPref};
        return data
    }

    return {
        comic,
        subsComic,
        getComic,
        getComicById,
        getPref
    }

}
