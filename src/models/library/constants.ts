export const COMIC_EXTENSIONS = new Set(['.cbz', '.cbr', '.cb7', '.cbt']);

export const IDENTIFY_CONCURRENCY = 4;

export const STAT_CONCURRENCY = 64;

/** The entries per page when a GET /api/library request has no limit value. */
export const DEFAULT_LIBRARY_PAGE_SIZE = 100;

/** The maximum client-supplied page size. This stops one request from pulling the whole library. */
export const MAX_LIBRARY_PAGE_SIZE = 500;