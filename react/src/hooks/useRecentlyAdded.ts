import { useEffect, useRef, useState } from 'react';
import { getRecentlyAdded } from '@/services/library.service';
import type { ILibraryResponseItem } from '@/library.types';

export function useRecentlyAdded(windowHours: number) {

    const [items, setItems] = useState<ILibraryResponseItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);

    useEffect(() => {

        const currentRequest = ++requestId.current;
        setIsLoading(true);
        setError(null);

        getRecentlyAdded(windowHours)
            .then(data => {
                if (requestId.current !== currentRequest) return;
                setItems(data.items);
            })
            .catch(() => {
                if (requestId.current === currentRequest)
                    setError('Recently added comics could not be loaded.');
            })
            .finally(() => {
                if (requestId.current === currentRequest)
                    setIsLoading(false);
            });

    }, [windowHours]);

    return { items, isLoading, error };

}
