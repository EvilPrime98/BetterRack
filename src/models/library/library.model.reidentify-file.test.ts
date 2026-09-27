import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { WikiComic } from 'better-wiki';
import type { TAppSettings, TComicData } from '#src/types.ts';
import { LibraryModel } from './library.model';

const uidFromPath = (absPath: string) => {
    const hash = crypto.createHash('sha256').update(path.resolve(absPath)).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};

let root: string;

const makeModel = (comic: WikiComic | null) => {
    const prefsModel = {
        getAppSettings: () => ({ outputDirs: [root], identifyFromMeta: false } as unknown as TAppSettings),
        getAllLibraryPrefs: () => [],
    };
    const store = new Map<string, TComicData>();
    const comicDataModel = {
        getAll: () => Object.fromEntries(store),
        getByUid: (uid: string) => store.get(uid),
        upsert: (uid: string, partial: Partial<Omit<TComicData, 'uid'>>) => {
            const merged = { uid, ...store.get(uid), ...partial } as TComicData;
            store.set(uid, merged);
            return merged;
        },
    };
    let wikiCalls = 0;
    const wikiModel = {
        getComic: async () => { wikiCalls++; return comic; },
    };
    const zipModel = {
        extractComicInfo: async () => null,
    };
    const model = new LibraryModel(
        prefsModel as unknown as ConstructorParameters<typeof LibraryModel>[0],
        wikiModel as unknown as ConstructorParameters<typeof LibraryModel>[1],
        comicDataModel as unknown as ConstructorParameters<typeof LibraryModel>[2],
        zipModel as unknown as ConstructorParameters<typeof LibraryModel>[3],
    );
    return { model, store, wikiCalls: () => wikiCalls };
};

beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'library-reidentify-file-test-'));
    await writeFile(path.join(root, 'comic.cbz'), 'placeholder');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('LibraryModel.reidentifyFile', () => {

    test('forces a fresh wiki lookup even though the entry was already identified', async () => {
        const firstComic = { title: 'First Title', pageId: 1, sourceWiki: 'dc' } as unknown as WikiComic;
        const { model, wikiCalls } = makeModel(firstComic);
        await model.ready;

        const uid = uidFromPath(path.join(root, 'comic.cbz'));

        const first = await model.identify(uid);
        expect(first.identified).toBe(true);
        expect(wikiCalls()).toBe(1);

        const again = await model.identify(uid);
        expect(wikiCalls()).toBe(1);
        expect(again.comic?.title).toBe('First Title');

        const result = await model.reidentifyFile(uid);

        expect(wikiCalls()).toBe(2);
        expect(result.identified).toBe(true);
        expect(result.comic?.title).toBe('First Title');
    });

    test('throws when the uid does not match a file entry', async () => {
        const { model } = makeModel({ title: 'Title' } as unknown as WikiComic);
        await model.ready;

        await expect(model.reidentifyFile('missing-uid')).rejects.toThrow('Comic not found.');
    });

});
