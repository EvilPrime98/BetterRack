import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { useLibraryStore } from '@/stores/library.store';
import { useComicCacheStore } from '@/stores/comicCache.store';
import { useComicsTypeStore } from '@/stores/comicsTypes.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useServerModalStore } from '@/stores/serverModal.store';
import { useUserPrefStore } from '@/stores/userPref.store';
import { AppLoader } from '@/components/app-loader/app-loader';
import { ServerModal } from '@/components/server-modal/server-modal';
import { LibraryPage } from '@/pages/library-page';
import { ReaderPage } from '@/pages/reader.page';
import { SettingsPage } from '@/pages/settings.page';
import { StorePage } from '@/pages/store.page';

export function App() {

    const { isLoading, setIsLoading } = useAppContext();

    useEffect(() => {
        (async () => {
            await useServerModalStore.getState().ensureServerConfigured();
            setIsLoading(true);
            await Promise.all([
                Promise.allSettled([
                    useLibraryStore.getState().fetchLibrary(),
                    useComicCacheStore.getState().init(),
                    useSettingsStore.getState().fetchSettings()
                ])
            ]);
            useUserPrefStore.getState().init();
            useComicsTypeStore.getState().init();
            setIsLoading(false);
        })();
        
    }, []);

    return (
        <>
            <AppLoader visible={isLoading} />

            {!isLoading && (
                <Routes>
                    <Route path="/:uid/reader" element={<ReaderPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/store" element={<StorePage />} />
                    <Route path="/:uid" element={<LibraryPage />} />
                    <Route path="*" element={<LibraryPage />} />
                </Routes>
            )}

            <ServerModal />
        </>
    );

}
