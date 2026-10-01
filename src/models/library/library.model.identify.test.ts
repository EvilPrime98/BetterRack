import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { WikiComic } from 'better-wiki';
import type { IComicInfoXML, TAppSettings } from '#src/types.ts';
import { LibraryModel } from './library.model';

const uidFromPath = (absPath: string) => {
    const hash = crypto.createHash('sha256').update(path.resolve(absPath)).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};

let root: string;

const fakeWikiComic = { title: 'Wiki Title', pageId: 1, sourceWiki: 'dc' } as unknown as WikiComic;

const fakeComicInfo = {
    ComicInfo: { Title: 'XML Title', Series: 'XML Title', Number: 1, Volume: 1, Year: 2024, Month: 1 },
} as unknown as IComicInfoXML;

const makeModel = (
    wikiSearch: boolean,
    comicInfo: IComicInfoXML | null
) => {
    const prefsModel = {
        getAppSettings: () => ({ outputDirs: [root], wikiSearch } as unknown as TAppSettings),
        getAllLibraryPrefs: () => [],
    };
    const comicDataModel = {
        getAll: () => ({}),
        getByUid: () => undefined,
        upsert: () => undefined,
    };
    let wikiCalls = 0;
    let zipCalls = 0;
    const wikiModel = {
        getComic: async () => { wikiCalls++; return fakeWikiComic; },
    };
    const zipModel = {
        extractComicInfo: async () => { zipCalls++; return comicInfo; },
    };
    const model = new LibraryModel(
        prefsModel as unknown as ConstructorParameters<typeof LibraryModel>[0],
        wikiModel as unknown as ConstructorParameters<typeof LibraryModel>[1],
        comicDataModel as unknown as ConstructorParameters<typeof LibraryModel>[2],
        zipModel as unknown as ConstructorParameters<typeof LibraryModel>[3],
    );
    return { model, calls: () => ({ wikiCalls, zipCalls }) };
};

beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'library-identify-test-'));
    await writeFile(path.join(root, 'comic.cbz'), 'placeholder');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('LibraryModel.identify — wikiSearch gating', () => {

    test('uses ComicInfo.xml and never the wiki when wiki search is off', async () => {
        const { model, calls } = makeModel(false, fakeComicInfo);
        await model.ready;

        const result = await model.identify(uidFromPath(path.join(root, 'comic.cbz')));

        expect(calls().zipCalls).toBe(1);
        expect(calls().wikiCalls).toBe(0);
        expect(result.comic?.title).toBe('XML Title');
        expect(result.metaSource).toBe('comicinfo');
    });

    test('stays unidentified without hitting the wiki when wiki search is off and no XML is found', async () => {
        const { model, calls } = makeModel(false, null);
        await model.ready;

        const result = await model.identify(uidFromPath(path.join(root, 'comic.cbz')));

        expect(calls().zipCalls).toBe(1);
        expect(calls().wikiCalls).toBe(0);
        expect(result.identified).toBe(false);
    });

    test('prefers ComicInfo.xml over the wiki when wiki search is on and XML is found', async () => {
        const { model, calls } = makeModel(true, fakeComicInfo);
        await model.ready;

        const result = await model.identify(uidFromPath(path.join(root, 'comic.cbz')));

        expect(calls().zipCalls).toBe(1);
        expect(calls().wikiCalls).toBe(0);
        expect(result.metaSource).toBe('comicinfo');
    });

    test('falls back to the wiki when wiki search is on but no usable XML is found', async () => {
        const { model, calls } = makeModel(true, null);
        await model.ready;

        const result = await model.identify(uidFromPath(path.join(root, 'comic.cbz')));

        expect(calls().zipCalls).toBe(1);
        expect(calls().wikiCalls).toBe(1);
        expect(result.comic?.title).toBe('Wiki Title');
        expect(result.metaSource).toBe('wiki');
    });

});
