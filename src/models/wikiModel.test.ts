import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { WikiComic } from 'better-wiki';

type TWikiOptions = { plugin: string; url: string };

const marvelComic = { title: 'Marville Vol 1 2', volume: '1', issue: '2' } as unknown as WikiComic;

const created: TWikiOptions[] = [];
const getComicCalls: { url: string; flags: Record<string, unknown> }[] = [];
const getComicByIdCalls: { url: string; flags: Record<string, unknown> }[] = [];

mock.module('better-wiki', () => ({
    wiki: (options: TWikiOptions) => {
        created.push(options);
        return {
            getComic: async (_title: string, flags: Record<string, unknown>) => {
                getComicCalls.push({ url: options.url, flags });
                if (options.url !== 'https://marvel.fandom.com') return flags.multiple ? [] : null;
                return flags.multiple ? [marvelComic] : marvelComic;
            },
            getComicById: async (_pageId: number, flags: Record<string, unknown>) => {
                getComicByIdCalls.push({ url: options.url, flags });
                return marvelComic;
            },
        };
    },
}));

const { WikiModel } = await import('./wikiModel');
const { WIKI_URLS } = await import('#src/types.ts');

beforeEach(() => {
    created.length = 0;
    getComicCalls.length = 0;
    getComicByIdCalls.length = 0;
});

describe('WikiModel plugin selection', () => {
    test('uses marvel-fandom for the Marvel wiki and dc-fandom for the rest', () => {
        new WikiModel();

        expect(created).toHaveLength(WIKI_URLS.length);
        for (const { plugin, url } of created) {
            expect(plugin).toBe(url === 'https://marvel.fandom.com' ? 'marvel-fandom' : 'dc-fandom');
        }
    });

    test('does not forward fields to the marvel plugin', async () => {
        const result = await new WikiModel().getComic('Marville 01 (2002).cbr');

        expect(result).toBe(marvelComic);
        const marvelCall = getComicCalls.find(call => call.url === 'https://marvel.fandom.com');
        expect(marvelCall?.flags).not.toHaveProperty('fields');
        const dcCall = getComicCalls.find(call => call.url === 'https://dc.fandom.com');
        expect(dcCall?.flags).toHaveProperty('fields');
    });

    test('getComics flattens results across wikis', async () => {
        const results = await new WikiModel().getComics('Marville');

        expect(results).toEqual([marvelComic]);
        expect(getComicCalls.every(call => call.flags.multiple === true)).toBe(true);
    });

    test('getComicById routes to the requested wiki', async () => {
        const result = await new WikiModel().getComicById(129668, 'https://marvel.fandom.com');

        expect(result).toBe(marvelComic);
        expect(getComicByIdCalls).toEqual([{ url: 'https://marvel.fandom.com', flags: { thumbnailSize: 120 } }]);
    });
});
