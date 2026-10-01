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

const fakeWikiComic = { title: 'Wiki Title', pageId: 1, sourceWiki: 'dc' } as unknown as WikiComic;

let root: string;

const makeModel = () => {
    const prefsModel = {
        getAppSettings: () => ({ outputDirs: [root], wikiSearch: true } as unknown as TAppSettings),
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
        resetIdentification: () => {
            for (const [uid, data] of store) {
                store.set(uid, { ...data, identified: undefined, comic: undefined, sourceWiki: undefined, prefId: undefined });
            }
        },
    };
    let wikiCalls = 0;
    const wikiModel = {
        getComic: async () => { wikiCalls++; return fakeWikiComic; },
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
    root = await mkdtemp(path.join(tmpdir(), 'library-reidentify-all-test-'));
    await writeFile(path.join(root, 'comic.cbz'), 'placeholder');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('LibraryModel.reidentifyAll', () => {

    test('resets identification state and re-triggers identification on next call', async () => {
        const { model, wikiCalls } = makeModel();
        await model.ready;

        const uid = uidFromPath(path.join(root, 'comic.cbz'));

        const first = await model.identify(uid);
        expect(first.identified).toBe(true);
        expect(wikiCalls()).toBe(1);

        await model.reidentifyAll();

        const entry = model.get(uid);
        expect(Array.isArray(entry)).toBe(false);
        expect((entry as { identified?: boolean }).identified).toBeUndefined();

        const second = await model.identify(uid);
        expect(second.identified).toBe(true);
        expect(wikiCalls()).toBe(2);
    });

    test('keeps user-injected comic data (read/read%/rating) untouched', async () => {
        const { model, store } = makeModel();
        await model.ready;

        const uid = uidFromPath(path.join(root, 'comic.cbz'));
        await model.identify(uid);
        store.set(uid, { ...store.get(uid)!, read: true, readPer: 42, rating: 5 });

        await model.reidentifyAll();

        const stored = store.get(uid);
        expect(stored?.identified).toBeUndefined();
        expect(stored?.read).toBe(true);
        expect(stored?.readPer).toBe(42);
        expect(stored?.rating).toBe(5);
    });

});
