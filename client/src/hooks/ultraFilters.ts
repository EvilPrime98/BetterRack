import { ultraCompState } from "ultra-light-js";
import type { ILibraryFilters, ILibraryResponseItem } from "../library.types";

export function ultraFilters({
    rawItems,
    items,
    setItems,
}:{
    rawItems: () => ILibraryResponseItem[];
    items: () => ILibraryResponseItem[];
    setItems: (value: ILibraryResponseItem[]) => void;
}) {

    const filters: ILibraryFilters = ultraCompState({
        sortByCreation: false,
        sortAlphabetically: true
    });

    filters.sortByCreation.subscribe(() => {
        setItems([...items()]
            .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
        );
    });

    filters.sortAlphabetically.subscribe(() => {
        setItems(rawItems());
    });

    return {
        filters
    }

}