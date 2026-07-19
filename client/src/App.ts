import { UltraRouter } from "ultra-light-js";
import { LibraryPage } from "./pages/library-page";
import { ReaderPage } from "./pages/reader.page";
import { COMIC_CACHE_CONTEXT } from "./context/comic-cache.context";
import { USER_PREF } from "./context/user-pref-cache.context";
import { COMICS_TYPE_CTX } from "./context/comics-types.context";

export function App() {

    COMIC_CACHE_CONTEXT.init();
    USER_PREF.init();
    COMICS_TYPE_CTX.init();

    return UltraRouter(
        { path: '/:uid/reader', component:({ uid } = {}) => ReaderPage({ uid }) },
        { path: '/:uid', component: ({ uid } = {}) => LibraryPage({ uid }) },       
        { path: '/*', component: () => LibraryPage({}) }
    )

}