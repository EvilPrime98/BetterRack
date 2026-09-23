import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DownloadModel } from './download.model';
import type { TProgressEvent } from './types';

function fakeResponse({
    url,
    chunks = [],
    status = 200,
    contentType = 'application/octet-stream',
    contentDisposition,
    htmlBody = '',
    throwAfterChunk,
}: {
    url: string;
    chunks?: Uint8Array[];
    status?: number;
    contentType?: string;
    contentDisposition?: string;
    htmlBody?: string;
    throwAfterChunk?: number;
}): Response {
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const headers = new Headers({
        'content-type': contentType,
        'content-length': String(total),
    });
    if (contentDisposition) headers.set('content-disposition', contentDisposition);
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

    test('names a pixeldrain file from Content-Disposition, not the ?download URL tail', async () => {
        const url = 'https://pixeldrain.com/api/file/aB3xK9m2?download';
        stubFetch([
            fakeResponse({
                url,
                chunks: [bytes('data')],
                contentDisposition: 'attachment; filename="Uncanny X-Men 001 (2019).cbz"',
            }),
        ]);

        const dest = await makeModel().downloadComic({
            link: { title: 'Uncanny X-Men (2019) #1', downloadLink: url },
            outputDir: workDir,
            quiet: true,
        });

        expect(dest).toBe(path.join(workDir, 'Uncanny X-Men 001 (2019).cbz'));
        expect(existsSync(path.join(workDir, 'Uncanny X-Men 001 (2019).cbz'))).toBe(true);
    });

    test('falls back to the resolved link title and strips illegal characters', async () => {
        const url = 'https://pixeldrain.com/api/file/z9Y8x7?download';
        stubFetch([fakeResponse({ url, chunks: [bytes('data')] })]);

        const dest = await makeModel().downloadComic({
            link: { title: 'What If...? / Spider-Man', downloadLink: url },
            outputDir: workDir,
            quiet: true,
        });

        expect(dest).toBe(path.join(workDir, 'What If... Spider-Man'));
        expect(existsSync(path.join(workDir, 'What If... Spider-Man'))).toBe(true);
    });

    test('retries a non-2xx status and stops after the budget', async () => {

        const url = 'https://example.test/files/five-oh-three.cbz';
        const { callCount } = stubFetch([fakeResponse({ url, status: 503 })]);
        const { events, onProgress } = collect();

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

describe('DownloadModel.downloadComic — cancellation', () => {

    test('stops mid-stream without retrying and removes the partial file', async () => {
        const url = 'https://example.test/files/big.cbz';
        let calls = 0;
        globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
            calls++;
            const signal = init!.signal!;
            let i = 0;
            return {
                ok: true,
                status: 200,
                url,
                headers: new Headers({ 'content-type': 'application/octet-stream', 'content-length': '10' }),
                clone() { return this; },
                async text() { return ''; },
                body: {
                    getReader() {
                        return {
                            async read() {
                                if (i++ === 0) return { done: false, value: bytes('AA') };
                                if (signal.aborted) throw signal.reason;
                                return new Promise((_resolve, reject) => {
                                    signal.addEventListener('abort', () => reject(signal.reason));
                                });
                            },
                        };
                    },
                },
            } as unknown as Response;
        }) as unknown as typeof fetch;
        const abortController = new AbortController();
        const events: TProgressEvent[] = [];

        const dest = await makeModel().downloadComic({
            link: { title: 'Big', downloadLink: url },
            outputDir: workDir,
            signal: abortController.signal,
            onProgress: (event) => {
                events.push(event);
                if (event.type === 'progress') abortController.abort();
            },
            quiet: true,
        });

        expect(dest).toBeUndefined();
        expect(calls).toBe(1);
        expect(events.some(e => e.type === 'retrying')).toBe(false);
        expect(events.some(e => e.type === 'done')).toBe(false);
        expect(events.at(-1)?.type).toBe('error');
        expect(existsSync(path.join(workDir, 'big.cbz'))).toBe(false);
    });

    test('removes a finished file when the signal is aborted before extraction', async () => {
        const url = 'https://example.test/files/late.cbz';
        stubFetch([fakeResponse({ url, chunks: [bytes('done')] })]);
        const abortController = new AbortController();
        abortController.abort();
        const { events, onProgress } = collect();

        const dest = await makeModel().downloadComic({
            link: { title: 'Late', downloadLink: url },
            outputDir: workDir,
            signal: abortController.signal,
            onProgress,
            quiet: true,
        });

        expect(dest).toBeUndefined();
        expect(events.some(e => e.type === 'done')).toBe(false);
        expect(existsSync(path.join(workDir, 'late.cbz'))).toBe(false);
    });

});

describe('DownloadModel.downloadComic — in-flight file naming', () => {

    test('only exposes the final file name once the transfer is complete', async () => {
        const url = 'https://example.test/files/inflight.cbz';
        const entriesMidTransfer: string[] = [];
        stubFetch([fakeResponse({ url, chunks: [bytes('AB'), bytes('CD')] })]);

        const dest = await makeModel().downloadComic({
            link: { title: 'Inflight', downloadLink: url },
            outputDir: workDir,
            onProgress: (event) => {
                if (event.type === 'progress') entriesMidTransfer.push(...readdirSync(workDir));
            },
            quiet: true,
        });

        expect(entriesMidTransfer).not.toContain('inflight.cbz');
        expect(dest).toBe(path.join(workDir, 'inflight.cbz'));
        expect(await readFile(dest!, 'utf8')).toBe('ABCD');
        expect(await readdir(workDir)).toEqual(['inflight.cbz']);
    });

});
