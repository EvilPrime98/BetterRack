import { afterEach, beforeEach, describe, expect, spyOn, test, type Mock } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ThumbnailModel } from './thumbnail.model';
import { RAW_EXTRACT_DIR, THUMBNAIL_CACHE_DIR, THUMBNAIL_QUALITY, THUMBNAIL_WIDTH } from './constants';
import type { TCompressorModel } from './types';

const FAKE_FFMPEG = '/fake/bin/ffmpeg';

const makeCompressorModel = (): TCompressorModel => ({
    listPages: async () => ['page1.png'],
    getPageStream: () => { throw new Error('not used in this test'); },
    extractPage: async ({ outDir }) => {
        await mkdir(outDir, { recursive: true });
        await writeFile(path.join(outDir, 'page1.png'), 'fake page bytes');
    },
    getPageMimeType: () => 'image/png'
});

const fakeFfmpeg = (spawn: Mock<typeof Bun.spawn>, exitCode: number, stderr = ''): void => {
    spawn.mockImplementation(((cmd: string[]) => ({
        stderr: new Blob([stderr]),
        exited: (async () => {
            if (exitCode === 0) await Bun.write(cmd[cmd.length - 1]!, 'fake webp bytes');
            return exitCode;
        })()
    })) as unknown as typeof Bun.spawn);
};

let workDir: string;
let archivePath: string;
let spawn: Mock<typeof Bun.spawn>;
let which: Mock<typeof Bun.which>;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'thumbnail-test-'));
    archivePath = path.join(workDir, 'comic.cbz');
    await writeFile(archivePath, 'not a real archive; only existence is checked');

    which = spyOn(Bun, 'which').mockReturnValue(FAKE_FFMPEG);
    spawn = spyOn(Bun, 'spawn');
});

afterEach(async () => {
    spawn.mockRestore();
    which.mockRestore();
    await rm(workDir, { recursive: true, force: true });
    await rm(THUMBNAIL_CACHE_DIR, { recursive: true, force: true });
    await rm(RAW_EXTRACT_DIR, { recursive: true, force: true });
});

describe('ThumbnailModel.optimize', () => {

    test('spawns ffmpeg to downscale the extracted page to a webp in the thumbnail cache', async () => {
        fakeFfmpeg(spawn, 0);

        const model = new ThumbnailModel(makeCompressorModel());
        const uid = `encode-${Date.now()}`;

        const outPath = await model.getThumbnail(uid, archivePath);

        const expectedOut = path.join(THUMBNAIL_CACHE_DIR, uid, `${uid}.webp`);
        expect(outPath).toBe(expectedOut);
        expect(spawn).toHaveBeenCalledTimes(1);

        const [cmd] = spawn.mock.calls[0]! as unknown as [string[]];
        expect(cmd[0]).toBe(FAKE_FFMPEG);
        expect(cmd).toContain(path.join(RAW_EXTRACT_DIR, uid, 'page1.png'));
        expect(cmd).toContain(`scale='min(iw,${THUMBNAIL_WIDTH})':-1`);
        expect(cmd).toContain('libwebp');
        expect(cmd).toContain(String(THUMBNAIL_QUALITY));
        expect(cmd[cmd.length - 1]).toBe(expectedOut);
    });

    test('removes the raw extracted page once encoding is done', async () => {
        fakeFfmpeg(spawn, 0);

        const model = new ThumbnailModel(makeCompressorModel());
        const uid = `cleanup-${Date.now()}`;

        await model.getThumbnail(uid, archivePath);

        expect(await Bun.file(path.join(RAW_EXTRACT_DIR, uid, 'page1.png')).exists()).toBe(false);
    });

    test('returns null and does not retry when ffmpeg exits non-zero', async () => {
        fakeFfmpeg(spawn, 1, 'Unknown encoder libwebp');

        const model = new ThumbnailModel(makeCompressorModel());
        const uid = `failing-${Date.now()}`;

        expect(await model.getThumbnail(uid, archivePath)).toBeNull();
        expect(await model.getThumbnail(uid, archivePath)).toBeNull();
        expect(spawn).toHaveBeenCalledTimes(1);
    });

});
