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
        Locations
    } = info.ComicInfo;

    return {
        title: Title ?? Series,
        volume: String(Volume),
        issue: String(Number),
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
            releaseMonth: String(Month),
            releaseYear: String(Year)
        },
        synopsis: Summary,
        rating: '',
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
        notes: Notes ? [Notes] : [],
        trivia: [],
        sourceWiki: ''
    };

}
