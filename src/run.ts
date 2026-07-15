import Bun from 'bun';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { LibraryModel } from './models/libraryModel';
import { libraryRouter } from './routers/libraryRouter';
import { comicReaderRouter } from './routers/comic-reader.router';
import { Zip7Decompressor } from './models/decompressor.model';
import { COMIC_TMP_DIR } from './controllers/comic-reader.controller';

const COMIC_TMP_TTL_MS = 30 * 60 * 1000;
const COMIC_TMP_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

async function startApp() {

    const OUTPUT_DIRS = (process.env.OUTPUT_DIR || '').split(',').map(dir => dir.trim()).filter(Boolean);
    if (OUTPUT_DIRS.length === 0) throw new Error('Output directory not defined');

    const app = new Hono();
    const libModel = new LibraryModel(OUTPUT_DIRS);
    const zipModel = new Zip7Decompressor();

    app.use(cors());

    app.route('/api/library', libraryRouter(libModel));

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

    app.use('/*', serveStatic({ root: './client/dist' }));
    
    app.get('/*', serveStatic({ path: 'index.html', root: './client/dist' }));

    app.notFound((c) => c.text('Not Found', 404));

    const server = Bun.serve({
        fetch: app.fetch,
        idleTimeout: 0
    });

    console.log(`Server running at ${server.url}`);

}

startApp();