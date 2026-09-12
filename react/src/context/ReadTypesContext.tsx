import { createContext, useContext, useState, type ReactNode } from 'react';
import type { TReadTypes } from '../library.types';

export function matchesReadFilter(readFilter: TReadTypes, readPer: number): boolean {
    if (readFilter === 'all') return true;
    if (readFilter === 'read') return readPer === 100;
    if (readFilter === 'reading') return readPer > 0 && readPer < 100;
    return readPer === 0;
}

interface IReadTypesContextValue {
    type: TReadTypes;
    next: () => void;
}

const ReadTypesContext = createContext<IReadTypesContextValue | null>(null);

export function ReadTypesProvider({ children }: { children: ReactNode }) {
    const [type, setType] = useState<TReadTypes>('all');

    const next = () => {
        setType((currType) => {
            if (currType === 'all') return 'read';
            if (currType === 'read') return 'reading';
            if (currType === 'reading') return 'unread';
            return 'all';
        });
    };

    return (
        <ReadTypesContext.Provider value={{ type, next }}>
            {children}
        </ReadTypesContext.Provider>
    );
}

export function useReadTypesContext(): IReadTypesContextValue {
    const ctx = useContext(ReadTypesContext);
    if (!ctx) throw new Error('useReadTypesContext must be used within ReadTypesProvider');
    return ctx;
}
