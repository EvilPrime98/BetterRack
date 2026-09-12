import path from "node:path";

export const THUMBNAIL_CACHE_DIR = path.resolve('./tmp-thumbnails');

export const META_EXTRACT_DIR = path.resolve('./tmp-meta');

export const RAW_EXTRACT_DIR = path.join(THUMBNAIL_CACHE_DIR, '.raw');

export const EXTRACT_CONCURRENCY = 4;

export const THUMBNAIL_WIDTH = 180;

export const THUMBNAIL_QUALITY = 82;

export const BACKGROUND_CACHE_DIR = path.resolve('./tmp-backgrounds');

export const BACKGROUND_WIDTH = 64;

export const BACKGROUND_QUALITY = 40;

export const BACKGROUND_BLUR_SIGMA = 12;