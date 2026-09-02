import crypto from "node:crypto";

/**
 * A strong ETag over a set of stable identity parts. Pass parts that change only
 * when the response bytes change. For an archive page these are the archive path,
 * the entry name, the archive size, and its mtime in ms. The parts are
 * JSON-encoded before the hash, so two different input sets cannot collide.
 */
export const buildStrongETag = (...parts: (string | number)[]): string => {
    const hash = crypto.createHash('sha1').update(JSON.stringify(parts)).digest('hex');
    return `"${hash}"`;
};

/**
 * True when the request `If-None-Match` matches `etag`, so the caller can answer
 * 304 without a read of the body. It accepts the comma-separated list form, a
 * `W/` prefix on a candidate, and `*`.
 */
export const ifNoneMatchSatisfied = (
    ifNoneMatch: string | undefined | null,
    etag: string,
): boolean => {
    if (!ifNoneMatch) return false;
    const header = ifNoneMatch.trim();
    if (header === '*') return true;
    return header
        .split(',')
        .map(candidate => candidate.trim())
        .some(candidate => candidate === etag || candidate === `W/${etag}`);
};
