import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ComicDataModel } from './comicDataModel';

let workDir: string;
let originalCwd: string;

beforeEach(async () => {
    originalCwd = process.cwd();
    workDir = await mkdtemp(path.join(tmpdir(), 'comic-data-test-'));
    process.chdir(workDir);
});

afterEach(async () => {
    process.chdir(originalCwd);
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
});

describe('ComicDataModel.upsert — lastReadAt', () => {

    test('stamps lastReadAt when reading progress changes', () => {
        const model = new ComicDataModel();
        const before = Date.now();

        const saved = model.upsert('uid-1', { currentPage: 3, readPer: 30 });

        expect(saved.lastReadAt).toBeGreaterThanOrEqual(before);
        expect(model.getByUid('uid-1')?.lastReadAt).toBe(saved.lastReadAt);
    });

    test('keeps lastReadAt when only the rating changes', () => {
        const model = new ComicDataModel();
        const first = model.upsert('uid-1', { currentPage: 3, readPer: 30 });

        const second = model.upsert('uid-1', { currentPage: 3, readPer: 30, rating: 4 });

        expect(second.lastReadAt).toBe(first.lastReadAt);
    });

    test('ignores a lastReadAt supplied by the caller', () => {
        const model = new ComicDataModel();
        const first = model.upsert('uid-1', { currentPage: 3, readPer: 30 });

        const second = model.upsert('uid-1', { currentPage: 3, readPer: 30, lastReadAt: 1 });

        expect(second.lastReadAt).toBe(first.lastReadAt);
    });

    test('leaves lastReadAt unset for an entry that never had progress', () => {
        const model = new ComicDataModel();

        const saved = model.upsert('uid-1', { rating: 5 });

        expect(saved.lastReadAt).toBeUndefined();
    });

});
