import { UltraComponent, UltraFragment, UltraRouter } from "ultra-light-js";
import { LibraryPage } from "./pages/library-page";
import { ReaderPage } from "./pages/reader.page";
import { SettingsPage } from "./pages/settings.page";
import { StorePage } from "./pages/store.page";
import { COMIC_CACHE_CONTEXT } from "./context/comic-cache.context";
import { USER_PREF } from "./context/user-pref-cache.context";
import { COMICS_TYPE_CTX } from "./context/comics-types.context";
import { SETTINGS_CONTEXT } from "./context/settings.context";
import { LIBRARY_CONTEXT } from "./context/library.context";
import { AppLoader } from "./components/app-loader/app-loader";
import { APP_CTX } from "./context/app.context";

export function App() {

    async function onMount() {
        APP_CTX.isLoading.set(true);
            await Promise.all([
                Promise.allSettled([
                    LIBRARY_CONTEXT.fetchLibrary(),
                    COMIC_CACHE_CONTEXT.init(),
                    SETTINGS_CONTEXT.fetchSettings()
                ]),
                new Promise(resolve => setTimeout(resolve, 1200)) //fictional delay
            ])
            USER_PREF.init();
            COMICS_TYPE_CTX.init();
        APP_CTX.isLoading.set(false);
    }

    return UltraComponent({

        component: UltraFragment(),

        children: [

            AppLoader({
                mode: {
                    state: APP_CTX.isLoading.get,
                    subscriber: APP_CTX.isLoading.subscribe
                }
            }),

            UltraRouter(
                { path: '/:uid/reader', component: ({ uid } = {}) => ReaderPage({ uid }) },
                { path: '/settings', component: () => SettingsPage() },
                { path: '/store', component: () => StorePage() },
                { path: '/:uid', component: ({ uid } = {}) => LibraryPage({ uid }) },
                { path: '/*', component: () => LibraryPage({}) }
            )

        ],

        onMount: [onMount]

    })

}