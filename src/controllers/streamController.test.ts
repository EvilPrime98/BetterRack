import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { streamController } from './streamController..ts';
import type { TLibraryEntry, TLibraryModel } from '#src/types.ts';

const dir = mkdtempSync(join(tmpdir(), 'br-stream-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function harness(path: string) {
    const libModel = {
        get: (uid?: string) => (uid === 'abc' ? ({ path } as TLibraryEntry) : undefined),
    } as unknown as TLibraryModel;
    const cc = new streamController(libModel);
    const app = new Hono();
    app.get('/:uuid', (c) => cc.get(c));
    return app;
}

describe('streamController', () => {
    test('streams the file with an attachment disposition', async () => {
        const path = join(dir, 'Batman 01.cbz');
        writeFileSync(path, 'data');
        const res = await harness(path).request('/abc');
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Length')).toBe('4');
        expect(res.headers.get('Content-Disposition')).toBe(
            `attachment; filename="Batman 01.cbz"; filename*=UTF-8''Batman%2001.cbz`
        );
        expect(await res.text()).toBe('data');
    });

    test('encodes non-ascii and percent characters in the filename', async () => {
        const path = join(dir, 'Pingüino 100%.cbz');
        writeFileSync(path, 'data');
        const res = await harness(path).request('/abc');
        const header = res.headers.get('Content-Disposition')!;
        expect(header).toContain('filename="Ping_ino 100_.cbz"');
        expect(header).toContain(`filename*=UTF-8''${encodeURIComponent('Pingüino 100%.cbz')}`);
    });

    test('returns 500 for an unknown uuid', async () => {
        const res = await harness(join(dir, 'x.cbz')).request('/nope');
        expect(res.status).toBe(500);
    });
});
