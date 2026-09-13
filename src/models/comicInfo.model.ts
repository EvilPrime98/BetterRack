import { XMLParser } from 'fast-xml-parser';
import type { IComicInfoPage, IComicInfoXML, TComicInfoModel, TComicPageType, TMangaYesNo, TYesNo } from "#src/types.ts";

const YES_NO_VALUES = new Set<TYesNo>(['Unknown', 'No', 'Yes']);

const MANGA_YES_NO_VALUES = new Set<TMangaYesNo>(['Unknown', 'No', 'Yes', 'YesAndRightToLeft']);

const PAGE_TYPE_TYPO_FIXES: Record<string, TComicPageType> = {
    Advertisment: 'Advertisement'
}; //historical typo still found in ComicInfo.xml files

const toInt = (
    value: unknown, 
    fallback: number
): number => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
    return Number.isFinite(n) ? n : fallback;
};

const toFloat = (
    value: unknown, 
    fallback: number
): number => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
    return Number.isFinite(n) ? n : fallback;
};

const normalizeYesNo = (
    value: unknown
): TYesNo => {
    return typeof value === 'string' && YES_NO_VALUES.has(value as TYesNo) ? (value as TYesNo) : 'Unknown';
};

const normalizeMangaYesNo = (
    value: unknown
): TMangaYesNo => {
    return typeof value === 'string' && MANGA_YES_NO_VALUES.has(value as TMangaYesNo) ? (value as TMangaYesNo) : 'Unknown';
};

const normalizePageType = (
    value: unknown
): TComicPageType => {
    if (typeof value !== 'string' || !value.trim()) return 'Story';
    return PAGE_TYPE_TYPO_FIXES[value] ?? (value as TComicPageType);
};

const normalizePages = (
    pages: unknown
): { Page?: IComicInfoPage | IComicInfoPage[] } | undefined => {

    if (!pages || typeof pages !== 'object') return undefined;

    const raw = (pages as { Page?: IComicInfoPage | IComicInfoPage[] }).Page;
    if (!raw) return { Page: [] };

    const list = Array.isArray(raw) ? raw : [raw];

    return {
        Page: list.map(page => ({
            ...page,
            "@_Type": normalizePageType(page["@_Type"])
        }))
    };

};

const normalizeComicInfo = (
    parsed: unknown
): IComicInfoXML | null => {

    const root = parsed as { ComicInfo?: unknown } | null | undefined;
    if (root?.ComicInfo === undefined || root.ComicInfo === null) return null;

    const raw = (typeof root.ComicInfo === 'object' 
        ? root.ComicInfo 
        : {}
    ) as Record<string, unknown>;

    return {
        ComicInfo: {
            ...raw,
            Number: raw.Number !== undefined && raw.Number !== null ? String(raw.Number) : undefined,
            Count: toInt(raw.Count, -1),
            Volume: toInt(raw.Volume, -1),
            AlternateCount: toInt(raw.AlternateCount, -1),
            Year: toInt(raw.Year, -1),
            Month: toInt(raw.Month, -1),
            Day: toInt(raw.Day, -1),
            PageCount: toInt(raw.PageCount, 0),
            PreferredFrontCover: toInt(raw.PreferredFrontCover, 0),
            CommunityRating: toFloat(raw.CommunityRating, 0),
            BlackAndWhite: normalizeYesNo(raw.BlackAndWhite),
            Manga: normalizeMangaYesNo(raw.Manga),
            Pages: normalizePages(raw.Pages)
        }
    } as IComicInfoXML;

};

export class ComicInfoModel implements TComicInfoModel {

    parse = (xml: string): IComicInfoXML | null => {
        try {
            const parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml);
            return normalizeComicInfo(parsed);
        } catch {
            return null;
        }
    }

}
