import type { CacheEntry } from "#src/types.ts";

export class CacheModel {

    private cache: Record<string, CacheEntry> = {};

    public get<T>(
        key: string
    ): T[] {
        const entry = this.cache[key];
        if (!entry) return [];
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            delete this.cache[key];
            return [];
        }
        const value = entry.value;
        const returnable = (value instanceof Array) ? value : [value]
        return returnable as T[];
    }

    public set<T>(
        key: string,
        value: T,
        ttlMs?: number
    ): void {
        this.cache[key] = {
            value,
            expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : null,
        };
    }

    public delete(
        key: string
    ): void {
        delete this.cache[key];
    }

}
