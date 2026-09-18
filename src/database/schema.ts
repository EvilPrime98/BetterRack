import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const appSettings = sqliteTable('app_settings', {
    key: text('key').primaryKey(),
    value: text('value'),
});

export const libraryItemPrefs = sqliteTable('library_item_prefs', {
    uid: text('uid').primaryKey(),
    prefPublisher: text('pref_publisher'),
    recursive: integer('recursive'),
    prefCover: text('pref_cover'),
});

export const comicData = sqliteTable('comic_data', {
    uid: text('uid').primaryKey(),
    prefId: integer('pref_id'),
    sourceWiki: text('source_wiki'),
    metaSource: text('meta_source'),
    cover: text('cover'),
    identified: integer('identified'),
    comic: text('comic'),
    rating: integer('rating'),
    currentPage: integer('current_page'),
    readPer: real('read_per'),
    read: integer('read'),
    lastReadAt: integer('last_read_at'),
});

export const downloadJobs = sqliteTable('download_jobs', {
    id: text('id').primaryKey(),
    resourceKey: text('resource_key').notNull(),
    label: text('label').notNull(),
    state: text('state').notNull(),
    progress: text('progress'),
    comicId: integer('comic_id').notNull(),
    outputDir: text('output_dir'),
    uuid: text('uuid'),
    strat: text('strat'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
});
