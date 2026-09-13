import type { IComicInfoXML } from "#src/types.ts";
import type { WikiAppearanceEntry, WikiComic } from "better-wiki";

const splitList = (
    value?: string
): string[] => {
    return value ? value.split(',').map(part => part.trim()).filter(Boolean) : [];
}

const toAppearanceEntries = (
    value?: string
): WikiAppearanceEntry[] => {
    return splitList(value).map(name => ({ name, pageTitle: name }));
}

const intOrEmpty = (
    value?: number
): string => {
    // Count/Volume/Year/Month default to -1 when absent
    return value === undefined || value === -1 ? '' : String(value);
}

export function comiInfoToWikiComicDTO(
    info: IComicInfoXML
): WikiComic {

    const {
        Title,
        Series,
        Number,
        Volume,
        Summary,
        Notes,
        Review,
        Writer,
        Penciller,
        Inker,
        Colorist,
        Letterer,
        Editor,
        Year,
        Month,
        Characters,
        Teams,
        Locations,
        CommunityRating
    } = info.ComicInfo;

    return {
        title: Title ?? Series ?? '',
        volume: intOrEmpty(Volume),
        issue: Number ?? '',
        cover: '',
        pageId: 0,
        credits: {
            writers: splitList(Writer),
            artists: splitList(Penciller),
            inkers: splitList(Inker),
            colorists: splitList(Colorist),
            letterers: splitList(Letterer),
            editors: splitList(Editor),
            executiveEditors: []
        },
        releaseDate: {
            releaseDay: '',
            releaseMonth: intOrEmpty(Month),
            releaseYear: intOrEmpty(Year)
        },
        synopsis: Summary ?? '',
        rating: CommunityRating ? String(CommunityRating) : '',
        event: '',
        storyTitles: [],
        appearing: {
            featuredCharacters: [],
            supportingCharacters: [],
            antagonists: [],
            otherCharacters: [
                ...toAppearanceEntries(Characters),
                ...toAppearanceEntries(Teams)
            ],
            locations: toAppearanceEntries(Locations),
            items: [],
            concepts: []
        },
        coverVariants: [],
        notes: [Notes, Review].filter((value): value is string => Boolean(value?.trim())),
        trivia: [],
        sourceWiki: ''
    };

}
