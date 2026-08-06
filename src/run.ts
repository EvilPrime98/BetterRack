import Bun from 'bun';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { LibraryModel } from './models/libraryModel';
import { libraryRouter } from './routers/libraryRouter';
import { comicReaderRouter } from './routers/comic-reader.router';
import { Zip7Decompressor } from './models/decompressor.model';
import { COMIC_TMP_DIR } from './controllers/comic-reader.controller';
import { WikiModel } from './models/wikiModel';
import { wikiRouter } from './routers/wikiRouter';
import { ComicDataModel } from './models/comic-data/comicDataModel';
import { comicDataRouter } from './routers/comicDataRouter';
import { PreferencesModel } from './models/preferencesModel';
import { settingsRouter } from './routers/settingsRouter';
import { CacheModel } from './models/cacheModel';
import { GetComicsApiModel } from './models/getComicsApiModel';
import { DownloadModel } from './models/downloadModel';
import { FileSystemModel } from './models/directoryModel';
import { comicsRouter } from './routers/comicsRouter';
import { downloadsRouter } from './routers/downloadsRouter';
import { ThumbnailModel } from './models/thumbnailModel';
import { thumbnailRouter } from './routers/thumbnailRouter';

const COMIC_TMP_TTL_MS = 30 * 60 * 1000;
const COMIC_TMP_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

async function startApp() {

    const app = new Hono();
    const prefsModel = new PreferencesModel();
    const zipModel = new Zip7Decompressor();
    const wikiModel = new WikiModel();
    const comicDataModel = new ComicDataModel();
    const thumbnailModel = new ThumbnailModel(zipModel);
    const libModel = new LibraryModel(prefsModel, wikiModel, comicDataModel);
    const cacheModel = new CacheModel();
    const gcwModel = new GetComicsApiModel(cacheModel, prefsModel);
    const dwnModel = new DownloadModel();
    const fsModel = new FileSystemModel(process.cwd());

    app.use(cors());

    app.route('/api/library', libraryRouter(libModel));

    app.route('/api/wiki', wikiRouter(wikiModel));

    app.route('/api/comic-data', comicDataRouter(comicDataModel));

    app.route('/api/settings', settingsRouter(prefsModel, libModel));

    app.route('/api/comics', comicsRouter(gcwModel));

    app.route('/api/downloads', downloadsRouter(dwnModel, gcwModel, fsModel, libModel));

    app.route('/api/thumbnail', thumbnailRouter(thumbnailModel, libModel));

    app.route('/read', comicReaderRouter({
        libModel: libModel,
        zipModel: zipModel
    }));

    setInterval(() => {
        zipModel.sweepStale({
            baseDir: COMIC_TMP_DIR,
            ttlMs: COMIC_TMP_TTL_MS
        }).catch(console.error);
    }, COMIC_TMP_SWEEP_INTERVAL_MS);

    const clientDistDir = './client/dist';

    app.use('/*', serveStatic({ root: clientDistDir }));

    app.get('/*', serveStatic({ path: 'index.html', root: clientDistDir }));

    app.notFound((c) => c.text('Not Found', 404));

    const server = Bun.serve({
        port: Number(process.env.PORT) || 3000,
        fetch: app.fetch,
        idleTimeout: 0
    });

    console.log(`Server running at ${server.url}`);

}

startApp();