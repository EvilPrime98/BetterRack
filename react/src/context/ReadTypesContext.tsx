import { createContext, useContext, useState, type ReactNode } from 'react';
import type { TReadTypes } from '../library.types';

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
