import { useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext.hooks';
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
import { StoreDownloadsPage } from '@/pages/store-downloads.page';
import { FilterPage } from '@/pages/filtered-page';
import { RecentPage } from '@/pages/recent-page';
import { ReadingPage } from '@/pages/reading-page';
import { DetailsPage } from './pages/details-page';

// Keying by uid forces ReaderPage to fully unmount/remount when navigating
// between comics (e.g. the "next" button), so stale pages/scroll/zoom from
// the previous comic never flash before the new one loads.
function ReaderRoute() {
    const { uid } = useParams<{ uid: string }>();
    return <ReaderPage key={uid} />;
}

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
    }, [setIsLoading]);

    return (
        <>
            <AppLoader visible={isLoading} />

            {!isLoading && (
                <Routes>
                    <Route path="/details/:pageId" element={<DetailsPage />} />
                    <Route path="/:uid/reader" element={<ReaderRoute />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/store/downloads" element={<StoreDownloadsPage />} />
                    <Route path="/store" element={<StorePage />} />
                    <Route path="/filters" element={<FilterPage />} />
                    <Route path="/new" element={<RecentPage />} />
                    <Route path="/reading" element={<ReadingPage />} />
                    <Route path="/:uid" element={<LibraryPage />} />
                    <Route path="*" element={<LibraryPage />} />
                </Routes>
            )}

            <ServerModal />
        </>
    );

}
