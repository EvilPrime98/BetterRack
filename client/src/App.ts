import { UltraRouter } from "ultra-light-js";
import { LibraryPage } from "./pages/library-page";
import { ReaderPage } from "./pages/reader.page";
import { COMIC_CACHE_CONTEXT } from "./context/comic-cache.context";

export function App() {

    COMIC_CACHE_CONTEXT.init();

    return UltraRouter(
        { path: '/:uid/reader', component:({ uid } = {}) => ReaderPage({ uid }) },
        { path: '/:uid', component: ({ uid } = {}) => LibraryPage({ uid }) },       
        { path: '/*', component: () => LibraryPage({}) }
    )

}