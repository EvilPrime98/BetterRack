import Bun from 'bun';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { LibraryModel } from './models/library/library.model';
import { libraryRouter } from './routers/libraryRouter';
import { comicReaderRouter } from './routers/comic-reader.router';
import { Zip7Decompressor } from './models/decompressor.model';
import { WikiModel } from './models/wikiModel';
import { wikiRouter } from './routers/wikiRouter';
import { ComicDataModel } from './models/comic-data/comicDataModel';
import { comicDataRouter } from './routers/comicDataRouter';
import { PreferencesModel } from './models/preferencesModel';
import { settingsRouter } from './routers/settingsRouter';
import { CacheModel } from './models/cacheModel';
import { GetComicsApiModel } from './models/getComicsApiModel';
import { DownloadModel } from './models/download/download.model';
import { PackExtractor } from './models/download/pack-extractor.model';
import { JobModel } from './models/jobs/jobs.model';
import { FileSystemModel } from './models/directoryModel';
import { fsRouter } from './routers/fsRouter';
import { comicsRouter } from './routers/comicsRouter';
import { downloadsRouter } from './routers/downloadsRouter';
import { ThumbnailModel } from './models/thumbnail/thumbnail.model';
import { thumbnailRouter, backgroundRouter } from './routers/thumbnailRouter';
import { apiKeyAuth } from './middleware/apiKeyAuthMiddleware';
import { logger } from '#utils/logger';
import type { TProgressEvent } from './types';
import pkg from '../package.json' with { type: 'json' };

async function startApp() {

    const app = new Hono();
    
    const prefsModel = new PreferencesModel();
    
    const zipModel = new Zip7Decompressor();
    
    const wikiModel = new WikiModel();
    
    const comicDataModel = new ComicDataModel();
    
    const thumbnailModel = new ThumbnailModel(
        zipModel, 
        logger.child({ module: 'ThumbnailModel' })
    );
    
    const libModel = new LibraryModel(prefsModel, wikiModel, comicDataModel, zipModel);
    
    const cacheModel = new CacheModel();
    
    const gcwModel = new GetComicsApiModel(cacheModel, prefsModel);
    
    const dwnModel = new DownloadModel(
        logger.child({ module: 'DownloadModel' }),
        new PackExtractor(zipModel)
    );
    
    const dwnJobModel = new JobModel<TProgressEvent>();
    
    const fsModel = new FileSystemModel(process.cwd());

    app.use(cors());

    app.use('/api/*', apiKeyAuth());
    app.use('/read/*', apiKeyAuth());

    app.route('/api/library', libraryRouter(libModel));

    app.route('/api/wiki', wikiRouter(wikiModel));

    app.route('/api/comic-data', comicDataRouter(comicDataModel));

    app.route('/api/settings', settingsRouter(prefsModel, libModel));

    app.route('/api/comics', comicsRouter(gcwModel));

    app.route('/api/downloads', downloadsRouter(dwnModel, gcwModel, fsModel, libModel, dwnJobModel));

    app.route('/api/directories', fsRouter(fsModel, prefsModel));

    app.route('/api/thumbnail', thumbnailRouter(thumbnailModel, libModel));

    app.route('/api/background', backgroundRouter(thumbnailModel, libModel));

    app.route('/read', comicReaderRouter({
        libModel: libModel,
        zipModel: zipModel
    }));

    app.get('/healthz', (c) => c.json({ app: 'betterrack', version: pkg.version }));

    const clientDistDir = process.env.CLIENT_DIST_DIR ?? './react/dist';

    app.use('/*', serveStatic({ root: clientDistDir }));

    app.get('/*', serveStatic({ path: 'index.html', root: clientDistDir }));

    app.notFound((c) => c.text('Not Found', 404));

    const portEnv = process.env.PORT;
    const port = portEnv === undefined || portEnv === '' ? 3000 : Number(portEnv);

    let server: ReturnType<typeof Bun.serve>;

    try {
        server = Bun.serve({
            port,
            fetch: app.fetch,
            idleTimeout: 0
        });
    } catch (err) {
        if (port !== 0 && (err as { code?: string }).code === 'EADDRINUSE') {
            logger.error(
                `Port ${port} is already in use. Set PORT=0 to let the OS pick a free port.`
            );
        }
        throw err;
    }

    console.log(`BR_SERVER_LISTENING ${server.port}`);

    logger.info(`Server running at ${server.url}`);

}

startApp();