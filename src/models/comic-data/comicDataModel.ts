import path from "node:path";
import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import type { TComicData, TComicDataModel } from "#src/types.ts";
import { comicData } from "#src/database/schema.ts";

export class ComicDataModel implements TComicDataModel {

    private db: BunSQLiteDatabase;

    constructor() {
        const dbPath = path.resolve('src/database/comic-data.sqlite');
        mkdirSync(path.dirname(dbPath), { recursive: true });
        const sqlite = new Database(dbPath, { create: true });
        sqlite.run(`
            CREATE TABLE IF NOT EXISTS comic_data (
                uid TEXT PRIMARY KEY,
                pref_id INTEGER,
                source_wiki TEXT,
                cover TEXT,
                identified INTEGER,
                comic TEXT,
                rating INTEGER,
                current_page INTEGER,
                read_per REAL,
                read INTEGER
            )
        `);
        for (const column of ['identified INTEGER', 'comic TEXT']) {
            try {
                sqlite.run(`ALTER TABLE comic_data ADD COLUMN ${column}`);
            } catch {
                // column already exists
            }
        }
        this.db = drizzle(sqlite);
    }

    private rowToComicData = (row: typeof comicData.$inferSelect): TComicData => ({
        uid: row.uid,
        prefId: row.prefId ?? undefined,
        sourceWiki: row.sourceWiki ?? undefined,
        identified: row.identified === null ? undefined : Boolean(row.identified),
        comic: row.comic ? JSON.parse(row.comic) : undefined,
        cover: row.cover ?? undefined,
        rating: row.rating ?? undefined,
        currentPage: row.currentPage ?? undefined,
        readPer: row.readPer ?? undefined,
        read: row.read === null ? undefined : Boolean(row.read),
    });

    getAll = (): Record<string, TComicData> => {
        const rows = this.db.select().from(comicData).all();
        const returnable: Record<string, TComicData> = {};
        for (const row of rows) returnable[row.uid] = this.rowToComicData(row);
        return returnable;
    }

    getByUid = (uid: string): TComicData | undefined => {
        const row = this.db.select().from(comicData).where(eq(comicData.uid, uid)).get();
        return row ? this.rowToComicData(row) : undefined;
    }

    upsert = (uid: string, partial: Partial<Omit<TComicData, 'uid'>>): TComicData => {
        const existing = this.getByUid(uid);
        const merged: TComicData = { uid, ...existing, ...partial };

        this.db.insert(comicData)
            .values({
                uid: merged.uid,
                prefId: merged.prefId ?? null,
                sourceWiki: merged.sourceWiki ?? null,
                identified: merged.identified === undefined ? null : Number(merged.identified),
                comic: merged.comic ? JSON.stringify(merged.comic) : null,
                cover: merged.cover ?? null,
                rating: merged.rating ?? null,
                currentPage: merged.currentPage ?? null,
                readPer: merged.readPer ?? null,
                read: merged.read === undefined ? null : Number(merged.read),
            })
            .onConflictDoUpdate({
                target: comicData.uid,
                set: {
                    prefId: merged.prefId ?? null,
                    sourceWiki: merged.sourceWiki ?? null,
                    identified: merged.identified === undefined ? null : Number(merged.identified),
                    comic: merged.comic ? JSON.stringify(merged.comic) : null,
                    cover: merged.cover ?? null,
                    rating: merged.rating ?? null,
                    currentPage: merged.currentPage ?? null,
                    readPer: merged.readPer ?? null,
                    read: merged.read === undefined ? null : Number(merged.read),
                },
            })
            .run();

        return merged;
    }

    resetIdentification = (): void => {
        this.db.update(comicData)
            .set({
                identified: null,
                comic: null,
                sourceWiki: null,
                prefId: null,
            })
            .run();
    }

}
