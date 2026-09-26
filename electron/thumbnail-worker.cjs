/* The packaged server starts this worker with ELECTRON_RUN_AS_NODE=1.
The worker exists because the `bun build --compile` server binary cannot load the sharp native addon.
Usage: thumbnail-worker.cjs <input> <output> <width> <quality> */

const sharp = require("sharp");

sharp.cache(false);

const [input, output, width, quality] = process.argv.slice(2);

sharp(input)
.resize({ width: Number(width), withoutEnlargement: true })
.webp({ quality: Number(quality) })
.toFile(output)
.then(
    () => process.exit(0),
    (err) => {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
);
