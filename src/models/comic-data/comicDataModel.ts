import path from "node:path";
import { Database } from "bun:sqlite";
import type { TComicData, TComicDataModel } from "#src/types.ts";
import type { TComicDataRow } from "./comicData.types";

export class ComicDataModel implements TComicDataModel {

    private db: Database;

    constructor() {
        const dbPath = process.env['COMIC_DATA_DB'] ?? path.resolve('src/database/comic-data.sqlite');
        this.db = new Database(dbPath, { create: true });
        this.db.run(`
            CREATE TABLE IF NOT EXISTS comic_data (
                uid TEXT PRIMARY KEY,
                pref_id INTEGER,
                source_wiki TEXT,
                cover TEXT,
                rating INTEGER,
                current_page INTEGER,
                read_per REAL,
                read INTEGER
            )
        `);
    }

    private rowToComicData = (row: TComicDataRow): TComicData => ({
        uid: row.uid,
        prefId: row.pref_id ?? undefined,
        sourceWiki: row.source_wiki ?? undefined,
        cover: row.cover ?? undefined,
        rating: row.rating ?? undefined,
        currentPage: row.current_page ?? undefined,
        readPer: row.read_per ?? undefined,
        read: row.read === null ? undefined : Boolean(row.read),
    });

    getAll = (): Record<string, TComicData> => {
        const rows = this.db.query<TComicDataRow, []>('SELECT * FROM comic_data').all();
        const returnable: Record<string, TComicData> = {};
        for (const row of rows) returnable[row.uid] = this.rowToComicData(row);
        return returnable;
    }

    getByUid = (uid: string): TComicData | undefined => {
        const row = this.db.query<TComicDataRow, [string]>('SELECT * FROM comic_data WHERE uid = ?').get(uid);
        return row ? this.rowToComicData(row) : undefined;
    }

    upsert = (uid: string, partial: Partial<Omit<TComicData, 'uid'>>): TComicData => {
        const existing = this.getByUid(uid);
        const merged: TComicData = { uid, ...existing, ...partial };

        this.db.run(`
            INSERT INTO comic_data (uid, pref_id, source_wiki, cover, rating, current_page, read_per, read)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET
                pref_id = excluded.pref_id,
                source_wiki = excluded.source_wiki,
                cover = excluded.cover,
                rating = excluded.rating,
                current_page = excluded.current_page,
                read_per = excluded.read_per,
                read = excluded.read
        `, [
            merged.uid,
            merged.prefId ?? null,
            merged.sourceWiki ?? null,
            merged.cover ?? null,
            merged.rating ?? null,
            merged.currentPage ?? null,
            merged.readPer ?? null,
            merged.read === undefined ? null : Number(merged.read),
        ]);

        return merged;
    }

}
