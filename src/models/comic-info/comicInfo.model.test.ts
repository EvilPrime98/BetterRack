import { describe, expect, test } from 'bun:test';
import { ComicInfoModel } from './comicInfo.model';

describe('ComicInfoModel.parse', () => {

    test('parses a well-formed ComicInfo.xml', () => {
        const model = new ComicInfoModel();

        const info = model.parse(
            '<ComicInfo><Series>Watchmen</Series><Number>1</Number><Volume>1</Volume></ComicInfo>'
        );

        expect(info?.ComicInfo.Series).toBe('Watchmen');
        expect(info?.ComicInfo.Number).toBe('1');
        expect(info?.ComicInfo.Volume).toBe(1);
    });

    test('normalizes the "Advertisment" typo and defaults an absent Type to Story', () => {
        const model = new ComicInfoModel();

        const info = model.parse(
            '<ComicInfo><Pages><Page Image="0" Type="Advertisment" /><Page Image="1" /></Pages></ComicInfo>'
        );
        const pages = info?.ComicInfo.Pages?.Page;

        expect(Array.isArray(pages)).toBe(true);
        expect((pages as { "@_Type"?: string }[])?.[0]?.["@_Type"]).toBe('Advertisement');
        expect((pages as { "@_Type"?: string }[])?.[1]?.["@_Type"]).toBe('Story');
    });

    test('applies spec defaults (-1) to Volume/Year/Month when absent', () => {
        const model = new ComicInfoModel();

        const info = model.parse('<ComicInfo></ComicInfo>');

        expect(info?.ComicInfo.Volume).toBe(-1);
        expect(info?.ComicInfo.Year).toBe(-1);
        expect(info?.ComicInfo.Month).toBe(-1);
        expect(info?.ComicInfo.PageCount).toBe(0);
        expect(info?.ComicInfo.BlackAndWhite).toBe('Unknown');
        expect(info?.ComicInfo.Manga).toBe('Unknown');
    });

    test('accepts exact YesNo/MangaYesNo enum strings', () => {
        const model = new ComicInfoModel();

        const info = model.parse(
            '<ComicInfo><BlackAndWhite>Yes</BlackAndWhite><Manga>YesAndRightToLeft</Manga></ComicInfo>'
        );

        expect(info?.ComicInfo.BlackAndWhite).toBe('Yes');
        expect(info?.ComicInfo.Manga).toBe('YesAndRightToLeft');
    });

    test('returns null on malformed XML instead of throwing', () => {
        const model = new ComicInfoModel();

        const info = model.parse('<ComicInfo attr="unterminated><Series>x</Series></ComicInfo>');

        expect(info).toBeNull();
    });

    test('returns null when the root element is not ComicInfo', () => {
        const model = new ComicInfoModel();

        const info = model.parse('<NotComicInfo><Series>x</Series></NotComicInfo>');

        expect(info).toBeNull();
    });

});
