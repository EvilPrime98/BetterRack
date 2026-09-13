import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { TAppSettings, TComicData } from '#src/types.ts';
import { LibraryModel } from './library.model';

const uidFromPath = (absPath: string) => {
    const hash = crypto.createHash('sha256').update(path.resolve(absPath)).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};

let root: string;

const makeModel = () => {
    const prefsModel = {
        getAppSettings: () => ({ outputDirs: [root], identifyFromMeta: true } as unknown as TAppSettings),
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
    let zipCalls = 0;
    const wikiModel = {
        getComic: async () => null,
    };
    const zipModel = {
        extractComicInfo: async () => {
            zipCalls++;
            throw new Error('Listing archive failed with code 2: ERROR: Cannot open the file as archive');
        },
    };
    const model = new LibraryModel(
        prefsModel as unknown as ConstructorParameters<typeof LibraryModel>[0],
        wikiModel as unknown as ConstructorParameters<typeof LibraryModel>[1],
        comicDataModel as unknown as ConstructorParameters<typeof LibraryModel>[2],
        zipModel as unknown as ConstructorParameters<typeof LibraryModel>[3],
    );
    return { model, zipCalls: () => zipCalls };
};

beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'library-identify-error-test-'));
    await writeFile(path.join(root, 'corrupt.cbz'), 'placeholder');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('LibraryModel.identify — extraction failures', () => {

    test('marks the entry as unidentified instead of leaving it pending', async () => {
        const { model } = makeModel();
        await model.ready;

        const uid = uidFromPath(path.join(root, 'corrupt.cbz'));
        const result = await model.identify(uid);

        expect(result.identified).toBe(false);
        expect(result.comic).toBeUndefined();
    });

    test('does not retry the failing extraction on a later call', async () => {
        const { model, zipCalls } = makeModel();
        await model.ready;

        const uid = uidFromPath(path.join(root, 'corrupt.cbz'));
        await model.identify(uid);
        await model.identify(uid);

        expect(zipCalls()).toBe(1);
    });

});
