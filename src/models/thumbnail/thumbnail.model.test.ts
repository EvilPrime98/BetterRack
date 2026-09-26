import { afterEach, beforeEach, describe, expect, mock, test, type Mock } from 'bun:test';
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ThumbnailModel } from './thumbnail.model';
import { RAW_EXTRACT_DIR, THUMBNAIL_CACHE_DIR } from './constants';
import type { TCompressorModel, TThumbnailEncoder } from './types';

const makeCompressorModel = (): TCompressorModel => ({
    listPages: async () => ['page1.png'],
    getPageStream: () => { throw new Error('not used in this test'); },
    extractPage: async ({ outDir }) => {
        await mkdir(outDir, { recursive: true });
        await writeFile(path.join(outDir, 'page1.png'), 'fake page bytes');
    },
    getPageMimeType: () => 'image/png'
});

const succeed = (encode: Mock<TThumbnailEncoder>): void => {
    encode.mockImplementation(async (_input, output) => {
        await Bun.write(output, 'fake webp bytes');
    });
};

const fail = (encode: Mock<TThumbnailEncoder>, message = 'boom'): void => {
    encode.mockImplementation(async () => {
        throw new Error(message);
    });
};

let workDir: string;
let archivePath: string;
let encode: Mock<TThumbnailEncoder>;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'thumbnail-test-'));
    archivePath = path.join(workDir, 'comic.cbz');
    await writeFile(archivePath, 'not a real archive; only existence is checked');

    encode = mock<TThumbnailEncoder>(async () => {});
});

afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
    await rm(THUMBNAIL_CACHE_DIR, { recursive: true, force: true });
    await rm(RAW_EXTRACT_DIR, { recursive: true, force: true });
});

describe('ThumbnailModel.optimize', () => {

    test('encodes the extracted page to a webp in the thumbnail cache', async () => {
        succeed(encode);

        const model = new ThumbnailModel(makeCompressorModel(), undefined, encode);
        const uid = `encode-${Date.now()}`;

        const outPath = await model.getThumbnail(uid, archivePath);

        const expectedOut = path.join(THUMBNAIL_CACHE_DIR, uid, `${uid}.webp`);
        expect(outPath).toBe(expectedOut);
        expect(encode).toHaveBeenCalledTimes(1);
        expect(encode).toHaveBeenCalledWith(path.join(RAW_EXTRACT_DIR, uid, 'page1.png'), expectedOut);
    });

    test('removes the raw extracted page once encoding is done', async () => {
        succeed(encode);

        const model = new ThumbnailModel(makeCompressorModel(), undefined, encode);
        const uid = `cleanup-${Date.now()}`;

        await model.getThumbnail(uid, archivePath);

        expect(await Bun.file(path.join(RAW_EXTRACT_DIR, uid, 'page1.png')).exists()).toBe(false);
    });

    test('returns null and does not retry when encoding fails', async () => {
        fail(encode, 'Input file is missing or corrupt');

        const model = new ThumbnailModel(makeCompressorModel(), undefined, encode);
        const uid = `failing-${Date.now()}`;

        expect(await model.getThumbnail(uid, archivePath)).toBeNull();
        expect(await model.getThumbnail(uid, archivePath)).toBeNull();
        expect(encode).toHaveBeenCalledTimes(1);
    });

});

describe('ThumbnailModel failure handling', () => {

    test('retries a failed extraction once the source file changes', async () => {
        fail(encode);

        const model = new ThumbnailModel(makeCompressorModel(), undefined, encode);
        const uid = `changed-${Date.now()}`;

        expect(await model.getThumbnail(uid, archivePath)).toBeNull();

        await writeFile(archivePath, 'the completed archive, now with more bytes');
        await utimes(archivePath, new Date(), new Date(Date.now() + 60_000));
        succeed(encode);

        expect(await model.getThumbnail(uid, archivePath)).toBe(path.join(THUMBNAIL_CACHE_DIR, uid, `${uid}.webp`));
        expect(encode).toHaveBeenCalledTimes(2);
    });

    test('returns null without marking a failure when the source file is missing', async () => {
        succeed(encode);

        const model = new ThumbnailModel(makeCompressorModel(), undefined, encode);
        const uid = `missing-${Date.now()}`;
        const missingPath = path.join(workDir, 'missing.cbz');

        expect(await model.getThumbnail(uid, missingPath)).toBeNull();

        await writeFile(missingPath, 'arrived later');

        expect(await model.getThumbnail(uid, missingPath)).not.toBeNull();
        expect(encode).toHaveBeenCalledTimes(1);
    });

    test('retry regenerates an unchanged file that previously failed', async () => {
        fail(encode);

        const model = new ThumbnailModel(makeCompressorModel(), undefined, encode);
        const uid = `retry-${Date.now()}`;

        expect(await model.getThumbnail(uid, archivePath)).toBeNull();

        succeed(encode);

        expect(await model.retry(uid, archivePath)).toBe(path.join(THUMBNAIL_CACHE_DIR, uid, `${uid}.webp`));
        expect(encode).toHaveBeenCalledTimes(2);
    });

    test('retry replaces an already cached thumbnail', async () => {
        succeed(encode);

        const model = new ThumbnailModel(makeCompressorModel(), undefined, encode);
        const uid = `recache-${Date.now()}`;

        await model.getThumbnail(uid, archivePath);
        await model.getThumbnail(uid, archivePath);
        expect(encode).toHaveBeenCalledTimes(1);

        await model.retry(uid, archivePath);
        expect(encode).toHaveBeenCalledTimes(2);
    });

});
