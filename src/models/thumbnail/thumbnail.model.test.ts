import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ThumbnailModel } from './thumbnail.model';
import { RAW_EXTRACT_DIR, THUMBNAIL_CACHE_DIR, THUMBNAIL_WIDTH } from './constants';
import type { TCompressorModel } from './types';

const resolveFfmpeg = (): string => {
    const bin = Bun.which('ffmpeg');
    if (!bin) throw new Error('ffmpeg not found on PATH; required to build the test fixture image.');
    return bin;
};

const resolveFfprobe = (): string => {
    const bin = Bun.which('ffprobe');
    if (!bin) throw new Error('ffprobe not found on PATH; required to inspect the generated thumbnail.');
    return bin;
};

const generateFixturePage = async (outPath: string, size: string): Promise<void> => {
    const proc = Bun.spawn([
        resolveFfmpeg(),
        '-y',
        '-f', 'lavfi',
        '-i', `testsrc=size=${size}`,
        '-frames:v', '1',
        outPath
    ], { stdout: 'ignore', stderr: 'ignore' });
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw new Error(`ffmpeg fixture generation failed with code ${exitCode}`);
};

const probeWidth = async (filePath: string): Promise<number> => {
    const proc = Bun.spawn([
        resolveFfprobe(),
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width',
        '-of', 'csv=p=0',
        filePath
    ], { stdout: 'pipe', stderr: 'ignore' });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw new Error(`ffprobe failed with code ${exitCode}`);
    return Number(output.trim());
};

const makeCompressorModel = (fixturePath: string): TCompressorModel => ({
    listPages: async () => ['page1.png'],
    getPageStream: () => { throw new Error('not used in this test'); },
    extractPage: async ({ outDir }) => {
        await mkdir(outDir, { recursive: true });
        await copyFile(fixturePath, path.join(outDir, 'page1.png'));
    },
    getPageMimeType: () => 'image/png'
});

let workDir: string;
let archivePath: string;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'thumbnail-test-'));
    archivePath = path.join(workDir, 'comic.cbz');
    await writeFile(archivePath, 'not a real archive; only existence is checked');
});

afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
    await rm(THUMBNAIL_CACHE_DIR, { recursive: true, force: true });
    await rm(RAW_EXTRACT_DIR, { recursive: true, force: true });
});

describe('ThumbnailModel.optimize', () => {

    test('downscales an oversized page to the configured width and encodes it as webp', async () => {
        const fixturePath = path.join(workDir, 'oversized.png');
        await generateFixturePage(fixturePath, '400x300');

        const model = new ThumbnailModel(makeCompressorModel(fixturePath));
        const uid = `oversized-${Date.now()}`;

        const outPath = await model.getThumbnail(uid, archivePath);

        expect(outPath).toBe(path.join(THUMBNAIL_CACHE_DIR, uid, `${uid}.webp`));
        expect(await probeWidth(outPath!)).toBe(THUMBNAIL_WIDTH);
    });

    test('does not upscale a page smaller than the configured width', async () => {
        const fixturePath = path.join(workDir, 'undersized.png');
        await generateFixturePage(fixturePath, '100x80');

        const model = new ThumbnailModel(makeCompressorModel(fixturePath));
        const uid = `undersized-${Date.now()}`;

        const outPath = await model.getThumbnail(uid, archivePath);

        expect(await probeWidth(outPath!)).toBe(100);
    });

});
