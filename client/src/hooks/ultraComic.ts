import type { WikiComic } from "better-wiki";
import { ultraQuery, ultraState } from "ultra-light.js";
import { wikiDcClient, wikiImageClient, wikiMarvelClient } from "../context/wiki.context";

const queryClient = ultraQuery();

async function fetchComic(title: string): Promise<WikiComic | null> {
    const [dc, marvel, image] = await Promise.all([
        wikiDcClient.getComic(title, { thumbnailSize: 450 }),
        wikiMarvelClient.getComic(title, { thumbnailSize: 450 }),
        wikiImageClient.getComic(title, { thumbnailSize: 450 })
    ]);
    return dc || marvel || image || null;
}

export function ultraComic() {

    const [comic, setComic, subsComic] = ultraState<WikiComic|null>(null);

    const getComic = async (title: string) => {
        const { data } = await queryClient.fetch(
            `comic:${title}`,
            () => fetchComic(title),
            60 * 5 * 10000
        ) as { data: WikiComic | null };
        setComic(data);
    }

    return {
        comic,
        subsComic,
        getComic
    }

}
