import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { ReadTypesProvider } from '@/context/ReadTypesContext';
import { MoveFileModalProvider } from '@/context/MoveFileModalContext';
import { NewFolderModalProvider } from '@/context/NewFolderModalContext';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <BrowserRouter>
            <AppProvider>
                <ReadTypesProvider>
                    <MoveFileModalProvider>
                        <NewFolderModalProvider>
                            {children}
                        </NewFolderModalProvider>
                    </MoveFileModalProvider>
                </ReadTypesProvider>
            </AppProvider>
        </BrowserRouter>
    );
}
