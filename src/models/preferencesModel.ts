import path from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import type { TAppSettings, TLibraryPref, TPreferencesModel } from "#src/types.ts";
import { appSettings, libraryItemPrefs } from "#src/database/schema.ts";

const DEFAULT_SETTINGS: TAppSettings = {
    outputDirs: [],
    apiUrl: '',
    baseUrl: '',
    hostDomain: '',
    downloadDir: '',
};

export class PreferencesModel implements TPreferencesModel {

    private db: BunSQLiteDatabase;

    constructor() {
        
        const dbPath = path.resolve('src/database/preferences.sqlite');
        
        mkdirSync(path.dirname(dbPath), { recursive: true });
        
        const sqlite = new Database(dbPath, { create: true });
        
        sqlite.run(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        sqlite.run(`
            CREATE TABLE IF NOT EXISTS library_item_prefs (
                uid TEXT PRIMARY KEY,
                pref_publisher TEXT,
                recursive INTEGER,
                pref_cover TEXT
            )
        `);

        this.db = drizzle(sqlite);
        
        this.seedAppSettingsFromEnvFile();
        
        this.seedLibraryPrefsFromFile();
    }

    private seedAppSettingsFromEnvFile = () => {

        try {
            
            const count = this.db.select().from(appSettings).all().length;
            if (count > 0) return;

            const filePath = path.resolve('.env');
            if (!existsSync(filePath)) return;

            const env: Record<string, string> = {};
            for (const line of readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const eq = trimmed.indexOf('=');
                if (eq === -1) continue;
                env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
            }

            const outputDirs = (env.OUTPUT_DIR || '').split(',').map(dir => dir.trim()).filter(Boolean);

            const seed: Partial<TAppSettings> = {};
            if (outputDirs.length > 0) seed.outputDirs = outputDirs;
            if (env.API_URL) seed.apiUrl = env.API_URL;
            if (env.BASE_URL) seed.baseUrl = env.BASE_URL;
            if (env.HOST_DOMAIN) seed.hostDomain = env.HOST_DOMAIN;
            if (env.DOWNLOAD_DIR) seed.downloadDir = env.DOWNLOAD_DIR;
            if (Object.keys(seed).length > 0) this.updateAppSettings(seed);

        } catch (e) {

            console.error('Failed to migrate app settings from .env:', e);

        }

    }

    private seedLibraryPrefsFromFile = () => {

        try {
            
            const count = this.db.select().from(libraryItemPrefs).all().length;
            if (count > 0) return;

            const filePath = path.resolve('src/database/library-pref.json');
            if (!existsSync(filePath)) return;

            const content = readFileSync(filePath, { encoding: 'utf-8' });
            const prefs: TLibraryPref[] = JSON.parse(content);

            for (const pref of prefs) {
                this.db.insert(libraryItemPrefs).values({
                    uid: pref.uid,
                    prefPublisher: pref.prefPublisher ?? null,
                    recursive: pref.recursive === undefined ? null : Number(pref.recursive),
                    prefCover: pref.prefCover ?? null,
                }).onConflictDoNothing().run();
            }

        } catch (e) {

            console.error('Failed to seed library prefs from file:', e);

        }
        
    }

    getAppSettings = (): TAppSettings => {
        const rows = this.db.select().from(appSettings).all();
        const values: Record<string, string> = {};
        for (const row of rows) values[row.key] = row.value ?? '';

        return {
            outputDirs: values.outputDirs ? JSON.parse(values.outputDirs) : DEFAULT_SETTINGS.outputDirs,
            apiUrl: values.apiUrl ?? DEFAULT_SETTINGS.apiUrl,
            baseUrl: values.baseUrl ?? DEFAULT_SETTINGS.baseUrl,
            hostDomain: values.hostDomain ?? DEFAULT_SETTINGS.hostDomain,
            downloadDir: values.downloadDir ?? DEFAULT_SETTINGS.downloadDir,
        };
    }

    updateAppSettings = (partial: Partial<TAppSettings>): TAppSettings => {
        for (const [key, value] of Object.entries(partial)) {
            if (value === undefined) continue;
            const stored = key === 'outputDirs' ? JSON.stringify(value) : String(value);
            this.db.insert(appSettings)
                .values({ key, value: stored })
                .onConflictDoUpdate({ target: appSettings.key, set: { value: stored } })
                .run();
        }
        return this.getAppSettings();
    }

    private rowToLibraryPref = (row: typeof libraryItemPrefs.$inferSelect): TLibraryPref => ({
        uid: row.uid,
        prefPublisher: row.prefPublisher ?? '',
        recursive: Boolean(row.recursive),
        prefCover: row.prefCover ?? '',
    });

    getLibraryPref = (uid: string): TLibraryPref | undefined => {
        const row = this.db.select().from(libraryItemPrefs).where(eq(libraryItemPrefs.uid, uid)).get();
        return row ? this.rowToLibraryPref(row) : undefined;
    }

    getAllLibraryPrefs = (): TLibraryPref[] => {
        const rows = this.db.select().from(libraryItemPrefs).all();
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

        this.db.insert(libraryItemPrefs)
            .values({
                uid: merged.uid,
                prefPublisher: merged.prefPublisher,
                recursive: Number(merged.recursive),
                prefCover: merged.prefCover,
            })
            .onConflictDoUpdate({
                target: libraryItemPrefs.uid,
                set: {
                    prefPublisher: merged.prefPublisher,
                    recursive: Number(merged.recursive),
                    prefCover: merged.prefCover,
                },
            })
            .run();

        return merged;
    }

}
