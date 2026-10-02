import { describe, expect, test } from "bun:test";
import { seriesOf } from "./series";
import type { TLibraryEntry } from "#src/types.ts";

const file = (name: string, comic?: { title: string; issue?: string }) => ({
    uid: name, did: false, name, path: name,
    ...(comic ? { identified: true, comic } : {}),
}) as unknown as TLibraryEntry;

describe('seriesOf', () => {
    test('ignores the comic title and groups by file name', () => {
        const a = seriesOf(file('Absolute Superman Vol 1 12.cbz', { title: 'Something Else 12', issue: '12' }));
        const b = seriesOf(file('Absolute Superman Vol 1 13.cbz', { title: 'Unrelated 13', issue: '13' }));
        expect(a.key).toBe(b.key);
        expect(a.name).toBe('Absolute Superman Vol 1');
    });
    test('groups files by file name', () => {
        expect(seriesOf(file('Absolute Superman Vol 1 12.cbz')).key)
            .toBe(seriesOf(file('Absolute Superman Vol. 1 013 (2025).cbz')).key);
    });
    test('different volumes stay separate', () => {
        expect(seriesOf(file('X Vol 1 3.cbz')).key).not.toBe(seriesOf(file('X Vol 2 3.cbz')).key);
    });
    test('handles dotted names and trailing release tags', () => {
        expect(seriesOf(file('Batman.012.cbz')).key).toBe(seriesOf(file('Batman 013 (Digital) [Group].cbz')).key);
    });
    test('handles chapter / range / "of N" suffixes', () => {
        const key = seriesOf(file('Saga Vol 2 Ch 5.cbz')).key;
        expect(key).toBe('saga vol 2');
        expect(seriesOf(file('Saga Vol 2 12-13.cbz')).key).toBe(key);
        expect(seriesOf(file('Saga Vol 02 7 of 9.cbz')).key).toBe(key);
    });
    test('a year before the issue separates volumes of the same title', () => {
        expect(seriesOf(file('Batman (2016) 012.cbz')).key).not.toBe(seriesOf(file('Batman (2011) 012.cbz')).key);
        expect(seriesOf(file('Batman (2016) 012 (2017).cbz')).key).toBe(seriesOf(file('Batman (2016) 013.cbz')).key);
    });
    test('normalizes accents, ampersands and leading "The"', () => {
        expect(seriesOf(file('The Pokémon & Friends 1.cbz')).key).toBe(seriesOf(file('Pokemon and Friends 2.cbz')).key);
    });
});
