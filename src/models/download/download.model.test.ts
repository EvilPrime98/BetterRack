import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DownloadModel } from './download.model';
import type { TProgressEvent } from './types';

// A stand-in Response covering only the surface DownloadModel touches:
// ok/status/url, the content-type and content-length headers, clone().text()
// for the Cloudflare probe, and a body reader that yields scripted chunks or
// throws mid-stream.
function fakeResponse({
    url,
    chunks = [],
    status = 200,
    contentType = 'application/octet-stream',
    htmlBody = '',
    throwAfterChunk,
}: {
    url: string;
    chunks?: Uint8Array[];
    status?: number;
    contentType?: string;
    htmlBody?: string;
    throwAfterChunk?: number;
}): Response {
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const headers = new Headers({
        'content-type': contentType,
        'content-length': String(total),
    });
    let i = 0;
    const response = {
        ok: status >= 200 && status < 300,
        status,
        url,
        headers,
        clone() { return response; },
        async text() { return htmlBody; },
        body: {
            getReader() {
                return {
                    async read() {
                        if (throwAfterChunk !== undefined && i === throwAfterChunk) {
                            throw new Error('The socket connection was closed unexpectedly.');
                        }
                        if (i >= chunks.length) return { done: true, value: undefined };
                        return { done: false, value: chunks[i++] };
                    },
                };
            },
        },
    };
    return response as unknown as Response;
}

const bytes = (s: string) => new TextEncoder().encode(s);

// Queue one outcome per fetch() call. A function is invoked, anything else is
// returned as-is; an Error is thrown to simulate a connection failure.
function stubFetch(outcomes: Array<Response | Error | (() => Response | Error)>) {
    let calls = 0;
    const impl = async () => {
        const outcome = outcomes[Math.min(calls, outcomes.length - 1)];
        calls++;
        const resolved = typeof outcome === 'function' ? outcome() : outcome;
        if (resolved instanceof Error) throw resolved;
        return resolved;
    };
    globalThis.fetch = impl as unknown as typeof fetch;
    return { callCount: () => calls };
}

let workDir: string;
const realFetch = globalThis.fetch;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'download-model-test-'));
});

afterEach(async () => {
    globalThis.fetch = realFetch;
    await rm(workDir, { recursive: true, force: true });
});

// Zero backoff keeps the retry tests instant.
const makeModel = () => new DownloadModel(undefined, undefined, {
    maxRetries: 2,
    backoffMs: 0,
    backoffCapMs: 0,
});

const collect = () => {
    const events: TProgressEvent[] = [];
    return { events, onProgress: (e: TProgressEvent) => events.push(e) };
};

describe('DownloadModel.downloadComic — transient network failures', () => {

    test('retries a dropped connection and completes the download', async () => {
        const url = 'https://example.test/files/comic.cbz';
        stubFetch([
            new Error('The socket connection was closed unexpectedly.'),
            fakeResponse({ url, chunks: [bytes('hello '), bytes('world')] }),
        ]);
        const { events, onProgress } = collect();

        const dest = await makeModel().downloadComic({
            link: { title: 'Comic', downloadLink: url },
            outputDir: workDir,
            onProgress,
            quiet: true,
        });

        expect(dest).toBe(path.join(workDir, 'comic.cbz'));
        expect(await readFile(path.join(workDir, 'comic.cbz'), 'utf8')).toBe('hello world');
        expect(events.some(e => e.type === 'retrying' && e.reason === 'network')).toBe(true);
        expect(events.at(-1)).toEqual({ type: 'done', filename: 'comic.cbz' });
    });

    test('emits a single terminal error after the retry budget is spent', async () => {
        const url = 'https://example.test/files/dead.cbz';
        const { callCount } = stubFetch([new Error('The socket connection was closed unexpectedly.')]);
        const { events, onProgress } = collect();

        const dest = await makeModel().downloadComic({
            link: { title: 'Dead', downloadLink: url },
            outputDir: workDir,
            onProgress,
            quiet: true,
        });

        expect(dest).toBeUndefined();
        expect(callCount()).toBe(3); // first try + maxRetries (2)
        expect(events.filter(e => e.type === 'error')).toHaveLength(1);
        expect(events.some(e => e.type === 'done')).toBe(false);
        expect(existsSync(path.join(workDir, 'dead.cbz'))).toBe(false);
    });

    test('restarts from the first byte when the socket closes mid-stream', async () => {
        const url = 'https://example.test/files/pack.cbz';
        stubFetch([
            fakeResponse({ url, chunks: [bytes('AA'), bytes('BB'), bytes('CC')], throwAfterChunk: 2 }),
            fakeResponse({ url, chunks: [bytes('AA'), bytes('BB'), bytes('CC')] }),
        ]);
        const { events, onProgress } = collect();

        const dest = await makeModel().downloadComic({
            link: { title: 'Pack', downloadLink: url },
            outputDir: workDir,
            onProgress,
            quiet: true,
        });

        expect(dest).toBe(path.join(workDir, 'pack.cbz'));
        expect(await readFile(path.join(workDir, 'pack.cbz'), 'utf8')).toBe('AABBCC');
        expect(events.some(e => e.type === 'retrying' && e.reason === 'network')).toBe(true);
        expect(events.at(-1)?.type).toBe('done');
    });

    test('removes the partial file when every attempt breaks mid-stream', async () => {
        const url = 'https://example.test/files/torn.cbz';
        stubFetch([
            () => fakeResponse({ url, chunks: [bytes('AA'), bytes('BB'), bytes('CC')], throwAfterChunk: 1 }),
        ]);
        const { events, onProgress } = collect();

        const dest = await makeModel().downloadComic({
            link: { title: 'Torn', downloadLink: url },
            outputDir: workDir,
            onProgress,
            quiet: true,
        });

        expect(dest).toBeUndefined();
        expect(events.filter(e => e.type === 'error')).toHaveLength(1);
        expect(existsSync(path.join(workDir, 'torn.cbz'))).toBe(false);
    });

    test('does not retry when noRetry is set', async () => {
        const url = 'https://example.test/files/once.cbz';
        const { callCount } = stubFetch([new Error('The socket connection was closed unexpectedly.')]);
        const { events, onProgress } = collect();

        await makeModel().downloadComic({
            link: { title: 'Once', downloadLink: url },
            outputDir: workDir,
            onProgress,
            quiet: true,
            noRetry: true,
        });

        expect(callCount()).toBe(1);
        expect(events.filter(e => e.type === 'error')).toHaveLength(1);
        expect(events.some(e => e.type === 'retrying')).toBe(false);
    });

    test('does not retry a Cloudflare challenge page', async () => {
        const url = 'https://example.test/files/blocked.cbz';
        const { callCount } = stubFetch([
            fakeResponse({
                url,
                status: 200,
                contentType: 'text/html',
                htmlBody: '<title>Just a moment...</title><div class="cf-challenge"></div>',
            }),
        ]);
        const { events, onProgress } = collect();

        await makeModel().downloadComic({
            link: { title: 'Blocked', downloadLink: url },
            outputDir: workDir,
            onProgress,
            quiet: true,
        });

        expect(callCount()).toBe(1);
        const errors = events.filter(e => e.type === 'error');
        expect(errors).toHaveLength(1);
        expect((errors[0] as { message: string }).message).toContain('Cloudflare');
    });

    test('retries a non-2xx status and stops after the budget', async () => {
        const url = 'https://example.test/files/five-oh-three.cbz';
        const { callCount } = stubFetch([fakeResponse({ url, status: 503 })]);
        const { events, onProgress } = collect();

        // REQUEST_DELAY between status retries is real; keep this to the
        // default 3-retry budget and just assert the shape.
        const model = new DownloadModel(undefined, undefined, { maxRetries: 1, backoffMs: 0, backoffCapMs: 0 });
        const dest = await model.downloadComic({
            link: { title: '503', downloadLink: url },
            outputDir: workDir,
            onProgress,
            quiet: true,
        });

        expect(dest).toBeUndefined();
        expect(callCount()).toBeGreaterThanOrEqual(2);
        expect(events.some(e => e.type === 'retrying' && e.reason === 'http' && e.status === 503)).toBe(true);
        expect(events.filter(e => e.type === 'error')).toHaveLength(1);
    }, 15_000);

});
