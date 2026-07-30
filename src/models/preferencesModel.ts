import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import type { TAppSettings, TLibraryPref, TPreferencesModel } from "#src/types.ts";
import type { TAppSettingRow, TLibraryPrefRow } from "./preferences.types";

const DEFAULT_SETTINGS: TAppSettings = {
    outputDirs: [],
    apiUrl: '',
    baseUrl: '',
    hostDomain: '',
};

export class PreferencesModel implements TPreferencesModel {

    private db: Database;

    constructor() {
        const dbPath = path.resolve('src/database/preferences.sqlite');
        this.db = new Database(dbPath, { create: true });
        this.db.run(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS library_item_prefs (
                uid TEXT PRIMARY KEY,
                pref_publisher TEXT,
                recursive INTEGER,
                pref_cover TEXT
            )
        `);
        this.seedAppSettingsFromEnv();
        this.seedLibraryPrefsFromFile();
    }

    private seedAppSettingsFromEnv = () => {
        try {
            const { count } = this.db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM app_settings').get()!;
            if (count > 0) return;

            const outputDirs = (process.env.OUTPUT_DIR || '').split(',').map(dir => dir.trim()).filter(Boolean);

            const seed: Partial<TAppSettings> = {};
            if (outputDirs.length > 0) seed.outputDirs = outputDirs;
            if (process.env.API_URL) seed.apiUrl = process.env.API_URL;
            if (process.env.BASE_URL) seed.baseUrl = process.env.BASE_URL;
            if (process.env.HOST_DOMAIN) seed.hostDomain = process.env.HOST_DOMAIN;

            if (Object.keys(seed).length > 0) this.updateAppSettings(seed);
        } catch (e) {
            console.error('Failed to seed app settings from env:', e);
        }
    }

    private seedLibraryPrefsFromFile = () => {
        try {
            const { count } = this.db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM library_item_prefs').get()!;
            if (count > 0) return;

            const filePath = process.env['LIB_PREFERENCES'] || path.resolve('src/database/library-pref.json');
            if (!existsSync(filePath)) return;

            const content = readFileSync(filePath, { encoding: 'utf-8' });
            const prefs: TLibraryPref[] = JSON.parse(content);

            for (const pref of prefs) {
                this.db.run(`
                    INSERT INTO library_item_prefs (uid, pref_publisher, recursive, pref_cover)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(uid) DO NOTHING
                `, [
                    pref.uid,
                    pref.prefPublisher ?? null,
                    pref.recursive === undefined ? null : Number(pref.recursive),
                    pref.prefCover ?? null,
                ]);
            }
        } catch (e) {
            console.error('Failed to seed library prefs from file:', e);
        }
    }

    getAppSettings = (): TAppSettings => {
        const rows = this.db.query<TAppSettingRow, []>('SELECT * FROM app_settings').all();
        const values: Record<string, string> = {};
        for (const row of rows) values[row.key] = row.value ?? '';

        return {
            outputDirs: values.outputDirs ? JSON.parse(values.outputDirs) : DEFAULT_SETTINGS.outputDirs,
            apiUrl: values.apiUrl ?? DEFAULT_SETTINGS.apiUrl,
            baseUrl: values.baseUrl ?? DEFAULT_SETTINGS.baseUrl,
            hostDomain: values.hostDomain ?? DEFAULT_SETTINGS.hostDomain,
        };
    }

    updateAppSettings = (partial: Partial<TAppSettings>): TAppSettings => {
        for (const [key, value] of Object.entries(partial)) {
            if (value === undefined) continue;
            const stored = key === 'outputDirs' ? JSON.stringify(value) : String(value);
            this.db.run(`
                INSERT INTO app_settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `, [key, stored]);
        }
        return this.getAppSettings();
    }

    private rowToLibraryPref = (row: TLibraryPrefRow): TLibraryPref => ({
        uid: row.uid,
        prefPublisher: row.pref_publisher ?? '',
        recursive: Boolean(row.recursive),
        prefCover: row.pref_cover ?? '',
    });

    getLibraryPref = (uid: string): TLibraryPref | undefined => {
        const row = this.db.query<TLibraryPrefRow, [string]>('SELECT * FROM library_item_prefs WHERE uid = ?').get(uid);
        return row ? this.rowToLibraryPref(row) : undefined;
    }

    getAllLibraryPrefs = (): TLibraryPref[] => {
        const rows = this.db.query<TLibraryPrefRow, []>('SELECT * FROM library_item_prefs').all();
        return rows.map(this.rowToLibraryPref);
    }

    upsertLibraryPref = (uid: string, partial: Partial<Omit<TLibraryPref, 'uid'>>): TLibraryPref => {
        const existing = this.getLibraryPref(uid);
        const merged: TLibraryPref = {
            uid,
            prefPublisher: '',
            recursive: false,
            prefCover: '',
            ...existing,
            ...partial,
        };

        this.db.run(`
            INSERT INTO library_item_prefs (uid, pref_publisher, recursive, pref_cover)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET
                pref_publisher = excluded.pref_publisher,
                recursive = excluded.recursive,
                pref_cover = excluded.pref_cover
        `, [
            merged.uid,
            merged.prefPublisher,
            Number(merged.recursive),
            merged.prefCover,
        ]);

        return merged;
    }

}
