import { useEffect, useRef, useState } from 'react';
import { FILTER_OPTIONS, type ILibraryFilters, type ILibraryResponseItem } from '../library.types';
import { useUserPrefStore } from '../stores/userPref.store';

function sortByReleaseDate(
    data: ILibraryResponseItem[]
): ILibraryResponseItem[] {
    return data
    .sort((a, b) => {
        const aDate = a.comic?.releaseDate;
        const bDate = b.comic?.releaseDate;
        if (!aDate || !bDate) return -1;
        const r1 = Number(aDate.releaseYear) - Number(bDate.releaseYear);
        if (r1 !== 0) return r1;
        const r2 = Number(aDate.releaseMonth) - Number(bDate.releaseMonth);
        if (r2 !== 0) return r2;
        return Number(aDate.releaseDay) - Number(bDate.releaseDay)
    })
}

export function useFilters({
    rawItems,
    setItems,
}: {
    rawItems: () => ILibraryResponseItem[];
    setItems: (value: ILibraryResponseItem[]) => void;
}) {

    const [filters, setFiltersState] = useState<ILibraryFilters>(() => ({
        sortByCreation: false,
        sortByReleaseDate: useUserPrefStore.getState().getPref('filter') === FILTER_OPTIONS.byReleaseDate
    }));

    const rawItemsRef = useRef(rawItems);
    rawItemsRef.current = rawItems;

    function applyFilters(current: ILibraryFilters = filters) {
        const source = [...rawItemsRef.current()];
        if (current.sortByReleaseDate) sortByReleaseDate(source);
        setItems(source);
    }

    function setFilters(updates: Partial<ILibraryFilters>) {
        const next = { ...filters, ...updates };
        setFiltersState(next);
        applyFilters(next);
    }

    function resetFilters() {
        const next: ILibraryFilters = { sortByCreation: false, sortByReleaseDate: false };
        setFiltersState(next);
        setItems(rawItemsRef.current());
    }

    // Runs once on mount rather than during render, so it fires after subscribers are set up.
    useEffect(() => {
        applyFilters(filters);
        
    }, []);

    return {
        filters,
        setFilters,
        resetFilters,
        applyFilters: () => applyFilters(filters),
    }

}
