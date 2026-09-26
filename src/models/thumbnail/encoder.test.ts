import { afterEach, beforeEach, describe, expect, mock, spyOn, test, type Mock } from 'bun:test';
import { THUMBNAIL_QUALITY, THUMBNAIL_WIDTH } from './constants';
import {
    createThumbnailEncoder,
    createWorkerEncoder,
    THUMBNAIL_RUNTIME_ENV_VAR,
    THUMBNAIL_WORKER_ENV_VAR
} from './encoder';

const RUNTIME = '/fake/electron';
const WORKER = '/fake/thumbnail-worker/worker.cjs';

type TPipeline = {
    resize: Mock<(options: { width: number; withoutEnlargement: boolean }) => TPipeline>;
    webp: Mock<(options: { quality: number }) => TPipeline>;
    toFile: Mock<(outputPath: string) => Promise<void>>;
};

const pipeline: TPipeline = {
    resize: mock(() => pipeline),
    webp: mock(() => pipeline),
    toFile: mock(async () => {})
};
const sharpFactory = Object.assign(
    mock<(inputPath: string) => TPipeline>(() => pipeline),
    { cache: mock<(enabled: boolean) => void>(() => {}) }
);

mock.module('sharp', () => ({ default: sharpFactory }));

let spawn: Mock<typeof Bun.spawn>;

const fakeWorker = (exitCode: number, stderr = ''): void => {
    spawn.mockImplementation((() => ({
        stderr: new Blob([stderr]),
        exited: Promise.resolve(exitCode)
    })) as unknown as typeof Bun.spawn);
};

beforeEach(() => {
    spawn = spyOn(Bun, 'spawn');
});

afterEach(() => {
    spawn.mockRestore();
    for (const fn of [pipeline.resize, pipeline.webp, pipeline.toFile, sharpFactory, sharpFactory.cache]) fn.mockClear();
});

describe('in-process encoder', () => {

    test('downscales to the thumbnail width without enlarging and writes a webp at the configured quality', async () => {
        await createThumbnailEncoder({})('/raw/page1.png', '/out/uid.webp');

        expect(sharpFactory).toHaveBeenCalledWith('/raw/page1.png');
        expect(pipeline.resize).toHaveBeenCalledWith({ width: THUMBNAIL_WIDTH, withoutEnlargement: true });
        expect(pipeline.webp).toHaveBeenCalledWith({ quality: THUMBNAIL_QUALITY });
        expect(pipeline.toFile).toHaveBeenCalledWith('/out/uid.webp');
    });

    test('disables the sharp cache so the raw page can be deleted afterwards on Windows', async () => {
        await createThumbnailEncoder({})('/raw/page1.png', '/out/uid.webp');

        expect(sharpFactory.cache).toHaveBeenCalledWith(false);
    });

    test('propagates encoding failures', async () => {
        pipeline.toFile.mockRejectedValueOnce(new Error('corrupt input'));

        await expect(createThumbnailEncoder({})('/raw/page1.png', '/out/uid.webp')).rejects.toThrow('corrupt input');
    });

    test('does not spawn a worker', async () => {
        await createThumbnailEncoder({})('/raw/page1.png', '/out/uid.webp');

        expect(spawn).not.toHaveBeenCalled();
    });

});

describe('createThumbnailEncoder selection', () => {

    test('uses the worker when both the runtime and worker paths are configured', async () => {
        fakeWorker(0);

        await createThumbnailEncoder({
            [THUMBNAIL_RUNTIME_ENV_VAR]: RUNTIME,
            [THUMBNAIL_WORKER_ENV_VAR]: WORKER
        })('/raw/page1.png', '/out/uid.webp');

        expect(spawn).toHaveBeenCalledTimes(1);
        expect(sharpFactory).not.toHaveBeenCalled();
    });

    test.each([
        ['only the runtime path', { [THUMBNAIL_RUNTIME_ENV_VAR]: RUNTIME }],
        ['only the worker path', { [THUMBNAIL_WORKER_ENV_VAR]: WORKER }],
        ['empty values', { [THUMBNAIL_RUNTIME_ENV_VAR]: '', [THUMBNAIL_WORKER_ENV_VAR]: '' }]
    ])('falls back to in-process sharp with %s', async (_label, env) => {
        await createThumbnailEncoder(env)('/raw/page1.png', '/out/uid.webp');

        expect(spawn).not.toHaveBeenCalled();
        expect(sharpFactory).toHaveBeenCalledTimes(1);
    });

});

describe('createWorkerEncoder', () => {

    test('runs the worker under the runtime as plain Node with the input, output, width and quality', async () => {
        fakeWorker(0);

        await createWorkerEncoder(RUNTIME, WORKER)('/raw/page1.png', '/out/uid.webp');

        const [cmd, options] = spawn.mock.calls[0]! as unknown as [string[], { env: Record<string, string> }];
        expect(cmd).toEqual([
            RUNTIME,
            WORKER,
            '/raw/page1.png',
            '/out/uid.webp',
            String(THUMBNAIL_WIDTH),
            String(THUMBNAIL_QUALITY)
        ]);
        expect(options.env.ELECTRON_RUN_AS_NODE).toBe('1');
    });

    test('rejects with the exit code and worker error output when the worker fails', async () => {
        fakeWorker(1, 'Input file is missing or corrupt\n');

        await expect(createWorkerEncoder(RUNTIME, WORKER)('/raw/page1.png', '/out/uid.webp'))
            .rejects.toThrow('Thumbnail encoding failed with code 1: Input file is missing or corrupt');
    });

    test('rejects with just the exit code when the worker prints nothing', async () => {
        fakeWorker(3);

        await expect(createWorkerEncoder(RUNTIME, WORKER)('/raw/page1.png', '/out/uid.webp'))
            .rejects.toThrow(/^Thumbnail encoding failed with code 3$/);
    });

});
