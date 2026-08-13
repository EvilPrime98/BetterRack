import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { FolderPrefsModalProvider } from '@/context/FolderPrefsModalContext';
import { ReadTypesProvider } from '@/context/ReadTypesContext';
import { MoveFileModalProvider } from '@/context/MoveFileModalContext';
import { NewFolderModalProvider } from '@/context/NewFolderModalContext';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <BrowserRouter>
            <AppProvider>
                <ReadTypesProvider>
                    <FolderPrefsModalProvider>
                        <MoveFileModalProvider>
                            <NewFolderModalProvider>
                                {children}
                            </NewFolderModalProvider>
                        </MoveFileModalProvider>
                    </FolderPrefsModalProvider>
                </ReadTypesProvider>
            </AppProvider>
        </BrowserRouter>
    );
}
