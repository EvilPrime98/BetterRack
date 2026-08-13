import { createContext, useContext, useState, type ReactNode } from 'react';

interface IAppContextValue {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}

const AppContext = createContext<IAppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    return (
        <AppContext.Provider value={{ isLoading, setIsLoading }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext(): IAppContextValue {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext must be used within AppProvider');
    return ctx;
}
