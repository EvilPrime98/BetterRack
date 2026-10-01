import path from "node:path";
import type { TLibraryEntry } from "#src/types.ts";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const TRAILING_GROUP = /\s*(?:\([^)]*\)|\[[^\]]*\])\s*$/;
const YEAR_GROUP = /^[([]\s*((?:19|20)\d{2})\s*[)\]]$/;

const TRAILING_ISSUE = new RegExp(
    '[\\s\\-:,]*(?:(?:issue|no|nr|chapter|ch|episode|ep)\\.?\\s*|#\\s*)?' +
    '\\d+(?:\\.\\d+)?[a-z]?' +
    '(?:\\s*[-–]\\s*\\d+(?:\\.\\d+)?[a-z]?)?' +
    '(?:\\s+of\\s+\\d+)?$',
    'i',
);
const TRAILING_VOLUME = /\b(?:volume|vol\.?|v)\s*\d+$/i;

const cleanBase = (raw: string) => {

    let base = raw
        .replace(/\.(cbz|cbr|cb7|cbt|zip|rar|7z|pdf)$/i, '')
        .replace(/_+/g, ' ')
        .trim();

    if (!/\s/.test(base)) base = base.replace(/\./g, ' ');

    while (TRAILING_GROUP.test(base)) base = base.replace(TRAILING_GROUP, '');

    base = base.replace(/\([^)]*\)|\[[^\]]*\]/g, (group) => {
        const year = YEAR_GROUP.exec(group)?.[1];
        return year ? ` (${year}) ` : ' ';
    });

    return base.replace(/\s+/g, ' ').trim();

};

export function seriesOf(entry: TLibraryEntry): { key: string; name: string } {

    const cleaned = cleanBase(entry.name);
    let base = cleaned;

    const issue = entry.identified ? entry.comic?.issue?.trim() : undefined;
    if (issue) {
        base = base.replace(new RegExp(`[\\s\\-:]*#?\\s*${escapeRegExp(issue)}$`, 'i'), '');
    }

    if (!TRAILING_VOLUME.test(base)) {
        base = base.replace(TRAILING_ISSUE, '');
    }
    base = base.replace(/[\s\-–:#,]+$/, '').trim();

    const name = base || cleaned || path.parse(entry.name).name;

    const key = name
        .normalize('NFD').replace(/\p{M}+/gu, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/\b(?:volume|vol\.?|v)\s*0*(\d+)\b/g, 'vol $1')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/^the\s+(?=\S)/, '')
        .trim();

    return { key, name };

}
