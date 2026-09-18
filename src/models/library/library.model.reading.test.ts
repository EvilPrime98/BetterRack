import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { LibraryModel } from './library.model';
import type { TComicData } from '#src/types.ts';

const uidFromPath = (absPath: string) => {
    const hash = crypto.createHash('sha256').update(path.resolve(absPath)).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};

let root: string;

const makeModel = (stored: Record<string, Partial<TComicData>>) => {
    const prefsModel = {
        getAppSettings: () => ({ outputDirs: [root] }),
        getAllLibraryPrefs: () => [],
    };
    const comicDataModel = { getAll: () => stored };
    return new LibraryModel(
        prefsModel as unknown as ConstructorParameters<typeof LibraryModel>[0],
        {} as unknown as ConstructorParameters<typeof LibraryModel>[1],
        comicDataModel as unknown as ConstructorParameters<typeof LibraryModel>[2],
        {} as unknown as ConstructorParameters<typeof LibraryModel>[3],
    );
};

const makeComic = async (name: string) => {
    const filePath = path.join(root, name);
    await writeFile(filePath, '');
    return uidFromPath(filePath);
};

beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'library-reading-test-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('LibraryModel.getReading', () => {

    test('returns only files that are started and not finished', async () => {
        const started = await makeComic('started.cbz');
        const finished = await makeComic('finished.cbz');
        const markedRead = await makeComic('marked-read.cbz');
        const untouched = await makeComic('untouched.cbz');
        const unread = await makeComic('unread.cbz');

        const model = makeModel({
            [started]: { readPer: 40 },
            [finished]: { readPer: 100 },
            [markedRead]: { readPer: 60, read: true },
            [unread]: { readPer: 0 },
        });
        await model.ready;

        const { items } = model.getReading();

        expect(items.map(item => item.uid)).toEqual([started]);
        expect(items.map(item => item.uid)).not.toContain(untouched);
    });

    test('never includes folders', async () => {
        const folderPath = path.join(root, 'series');
        await mkdir(folderPath);

        const model = makeModel({ [uidFromPath(folderPath)]: { readPer: 50 } });
        await model.ready;

        expect(model.getReading().items).toEqual([]);
    });

    test('orders by most recently read, with unstamped entries last by name', async () => {
        const older = await makeComic('older.cbz');
        const newer = await makeComic('newer.cbz');
        const legacyB = await makeComic('b-legacy.cbz');
        const legacyA = await makeComic('a-legacy.cbz');

        const model = makeModel({
            [older]: { readPer: 10, lastReadAt: 1_000 },
            [newer]: { readPer: 10, lastReadAt: 2_000 },
            [legacyB]: { readPer: 10 },
            [legacyA]: { readPer: 10 },
        });
        await model.ready;

        const { items } = model.getReading();

        expect(items.map(item => item.uid)).toEqual([newer, older, legacyA, legacyB]);
    });

    test('is empty when nothing is in progress', async () => {
        await makeComic('one.cbz');

        const model = makeModel({});
        await model.ready;

        expect(model.getReading().items).toEqual([]);
    });

});
