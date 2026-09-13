import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { WikiComic } from 'better-wiki';
import type { TAppSettings, TComicData } from '#src/types.ts';
import { LIBRARY_METADATA_FIELDS } from '#src/types.ts';
import { LibraryModel } from './library.model';

const uidFromPath = (absPath: string) => {
    const hash = crypto.createHash('sha256').update(path.resolve(absPath)).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};

let root: string;

const comicByName: Record<string, WikiComic> = {
    'alpha.cbz': { title: 'Alpha #1', volume: 'Alpha', credits: { writers: ['Writer A'] }, releaseDate: { releaseYear: '2020' } } as unknown as WikiComic,
    'beta.cbz': { title: 'Beta #1', volume: 'Beta', credits: { writers: ['Writer A', 'Writer B'] }, releaseDate: { releaseYear: '2021' } } as unknown as WikiComic,
    'gamma.cbz': null as unknown as WikiComic,
};

const makeModel = () => {
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
        resetIdentification: () => {
            for (const [uid, data] of store) {
                store.set(uid, { ...data, identified: undefined, comic: undefined, sourceWiki: undefined, prefId: undefined });
            }
        },
    };
    const wikiModel = {
        getComic: async (name: string) => comicByName[name] ?? null,
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
    return { model };
};

beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'library-metadata-scan-test-'));
    await writeFile(path.join(root, 'alpha.cbz'), 'placeholder');
    await writeFile(path.join(root, 'beta.cbz'), 'placeholder');
    await writeFile(path.join(root, 'gamma.cbz'), 'placeholder');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('LibraryModel.scanLibraryMetadata / getByMetadata', () => {

    test('identifies every pending entry and reports progress up to the total', async () => {
        const { model } = makeModel();
        await model.ready;

        const seen: { scanned: number; total: number }[] = [];
        await model.scanLibraryMetadata((progress) => seen.push(progress));

        expect(seen[0]).toEqual({ scanned: 0, total: 3 });
        expect(seen.at(-1)).toEqual({ scanned: 3, total: 3 });

        const alpha = model.get(uidFromPath(path.join(root, 'alpha.cbz')));
        expect(Array.isArray(alpha)).toBe(false);
        expect((alpha as { identified?: boolean }).identified).toBe(true);
    });

    test('is idempotent — a second scan has nothing pending', async () => {
        const { model } = makeModel();
        await model.ready;

        await model.scanLibraryMetadata();

        const seen: { scanned: number; total: number }[] = [];
        await model.scanLibraryMetadata((progress) => seen.push(progress));

        expect(seen).toEqual([{ scanned: 0, total: 0 }]);
    });

    test('groups by series, bucketing unidentified/no-match entries under Unknown', async () => {
        const { model } = makeModel();
        await model.ready;
        await model.scanLibraryMetadata();

        const groups = model.getByMetadata(LIBRARY_METADATA_FIELDS.series);
        const byKey = new Map(groups.map(g => [g.key, g.entries.map(e => e.name)]));

        expect(byKey.get('Alpha')).toEqual(['alpha.cbz']);
        expect(byKey.get('Beta')).toEqual(['beta.cbz']);
        expect(byKey.get('Unknown')).toEqual(['gamma.cbz']);
    });

    test('groups by writer, placing multi-writer entries in every writer group', async () => {
        const { model } = makeModel();
        await model.ready;
        await model.scanLibraryMetadata();

        const groups = model.getByMetadata(LIBRARY_METADATA_FIELDS.writer);
        const byKey = new Map(groups.map(g => [g.key, g.entries.map(e => e.name)]));

        expect(byKey.get('Writer A')).toEqual(['alpha.cbz', 'beta.cbz']);
        expect(byKey.get('Writer B')).toEqual(['beta.cbz']);
    });

    test('groups by year', async () => {
        const { model } = makeModel();
        await model.ready;
        await model.scanLibraryMetadata();

        const groups = model.getByMetadata(LIBRARY_METADATA_FIELDS.year);
        const byKey = new Map(groups.map(g => [g.key, g.entries.map(e => e.name)]));

        expect(byKey.get('2020')).toEqual(['alpha.cbz']);
        expect(byKey.get('2021')).toEqual(['beta.cbz']);
    });

    test('reidentifyAll invalidates the cached groups', async () => {
        const { model } = makeModel();
        await model.ready;
        await model.scanLibraryMetadata();

        const before = model.getByMetadata(LIBRARY_METADATA_FIELDS.series);
        expect(before.flatMap(g => g.entries)).toHaveLength(3);

        await model.reidentifyAll();

        const afterReset = model.getByMetadata(LIBRARY_METADATA_FIELDS.series);
        expect(afterReset).toEqual([{ key: 'Unknown', entries: afterReset[0]!.entries }]);
        expect(afterReset[0]!.entries).toHaveLength(3);
    });

});
