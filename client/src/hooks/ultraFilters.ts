import { ultraCompState, type IUltraCompStateStateful } from "ultra-light-js";
import { FILTER_OPTIONS, isIUltraCompStateStateful, type ILibraryFilters, type ILibraryResponseItem } from "../library.types";
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
        sortByReleaseDate: false
    })

    function sortByCreation(
        data: ILibraryResponseItem[]
    ): ILibraryResponseItem[]{
       return data
       .sort((a, b) => Number(a.createdAt) - Number(b.createdAt)) 
    }

    function applyFilters() {
        const source = [...rawItems()];
        if (filters.sortByCreation.get()) sortByCreation(source)
        setItems(source);
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

    Object
    .values(filters)
    .forEach(
        (f: IUltraCompStateStateful<boolean>) => f.subscribe(applyFilters)
    );


    filters.sortByCreation.set(USER_PREF.getPref('filter') === FILTER_OPTIONS.byCreation);

    return {
        filters,
        resetFilters,
        applyFilters,
    }

}