import { ultraQuery, ultraState } from "ultra-light.js"
import { getLibrary } from "../services/library.service";
import type { ILibraryGroup, ILibraryResponseItem } from "../library.types";

const queryClient = ultraQuery();

export function ultraLibrary({
    onlyDir = false,
    uid
}:{
    onlyDir: boolean,
    uid?: string
}){

    const [items, setItems, subsItems] = ultraState<ILibraryResponseItem[]>([]);

    async function fetchLibrary(){
        const { data: groups } = await queryClient.fetch(
            'library',
            getLibrary,
            60 * 5 * 10000
        ) as { data: ILibraryGroup[] }

        let data: ILibraryResponseItem[];
        const library = uid ? groups.find(g => g.uid === uid) : undefined;

        if (!uid) {
            // Root: each configured library shows up as a virtual top-level folder.
            data = groups.map(g => ({
                uid: g.uid,
                did: true,
                name: g.name,
                path: g.path,
                parentId: '',
                createdAt: ''
            }));
        } else if (library) {
            data = library.entries.filter(e => !e.parentId);
        } else {
            data = groups.flatMap(g => g.entries).filter(e => e.parentId === uid);
        }

        if (onlyDir) data = data.filter(i => i.did !== false);
        setItems(data);
    }

    return {
        items,
        subsItems,
        fetchLibrary,
        queryClient
    }

}