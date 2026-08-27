import path from "node:path";

export const THUMBNAIL_CACHE_DIR = path.resolve('./tmp-thumbnails');

export const RAW_EXTRACT_DIR = path.join(THUMBNAIL_CACHE_DIR, '.raw');

export const EXTRACT_CONCURRENCY = 4;

export const THUMBNAIL_WIDTH = 300;

export const THUMBNAIL_QUALITY = 82;