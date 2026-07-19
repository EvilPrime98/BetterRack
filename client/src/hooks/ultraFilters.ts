import { ultraCompState } from "ultra-light-js";
import { isIUltraCompStateStateful, type ILibraryFilters, type ILibraryResponseItem } from "../library.types";
import { USER_PREF } from "../context/user-pref-cache.context";

export function ultraFilters({
    rawItems,
    setItems,
}: {
    rawItems: () => ILibraryResponseItem[];
    setItems: (value: ILibraryResponseItem[]) => void;
}) {

    const filters: ILibraryFilters = ultraCompState({
        sortByCreation: false,
    });

    function applyFilters() {
        const source = rawItems();
        setItems(filters.sortByCreation.get()
            ? [...source].sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
            : source
        );
    }

    function resetFilters() {
        for (const key of Object.keys(filters)) {
            const keyVal = filters[key as keyof ILibraryFilters];
            if (isIUltraCompStateStateful(keyVal)) {
                keyVal.set(false);
            }
        }
        setItems(rawItems());
    }

    filters.sortByCreation.subscribe(() => applyFilters());

    filters.sortByCreation.set(USER_PREF.getPref('filter') === 'Creation Date');

    return {
        filters,
        resetFilters,
        applyFilters
    }

}