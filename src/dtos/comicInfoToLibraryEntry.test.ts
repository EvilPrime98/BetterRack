import { describe, expect, test } from 'bun:test';
import type { IComicInfoXML } from '#src/types.ts';
import { comiInfoToWikiComicDTO } from './comicInfoToLibraryEntry';

const baseComicInfo = (
    overrides: Partial<IComicInfoXML['ComicInfo']> = {}
): IComicInfoXML => ({
    '?xml': { '@_version': '1.0' },
    ComicInfo: {
        Series: 'Amazing Comic',
        Number: 12,
        Volume: 2,
        Summary: 'A summary.',
        Notes: 'Some notes.',
        Year: 2024,
        Month: 6,
        Publisher: 'Acme',
        Web: '',
        PageCount: 22,
        LanguageISO: 'en',
        '@_xmlns:xsd': '',
        '@_xmlns:xsi': '',
        ...overrides,
    },
});

describe('comiInfoToWikiComicDTO', () => {

    test('falls back to Series when Title is absent', () => {
        const result = comiInfoToWikiComicDTO(baseComicInfo());
        expect(result.title).toBe('Amazing Comic');
    });

    test('prefers Title over Series when both are present', () => {
        const result = comiInfoToWikiComicDTO(baseComicInfo({ Title: 'Custom Title' }));
        expect(result.title).toBe('Custom Title');
    });

    test('maps credit fields from comma-separated lists', () => {
        const result = comiInfoToWikiComicDTO(baseComicInfo({
            Writer: 'Alice, Bob',
            Penciller: 'Carol',
        }));
        expect(result.credits.writers).toEqual(['Alice', 'Bob']);
        expect(result.credits.artists).toEqual(['Carol']);
    });

    test('maps release date fields', () => {
        const result = comiInfoToWikiComicDTO(baseComicInfo());
        expect(result.releaseDate).toEqual({
            releaseDay: '',
            releaseMonth: '6',
            releaseYear: '2024',
        });
    });

    test('maps Characters and Teams into otherCharacters', () => {
        const result = comiInfoToWikiComicDTO(baseComicInfo({
            Characters: 'Hero, Sidekick',
            Teams: 'The Squad',
        }));
        expect(result.appearing.otherCharacters).toEqual([
            { name: 'Hero', pageTitle: 'Hero' },
            { name: 'Sidekick', pageTitle: 'Sidekick' },
            { name: 'The Squad', pageTitle: 'The Squad' },
        ]);
    });

    test('omits notes when Notes is absent', () => {
        const result = comiInfoToWikiComicDTO(baseComicInfo({ Notes: '' }));
        expect(result.notes).toEqual([]);
    });

});
