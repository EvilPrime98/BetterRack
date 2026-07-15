import type { CacheEntry } from "#src/types.ts";

export class CacheModel {

    private cache: Record<string, CacheEntry> = {};

    public get(
        key: string
    ): any[] {
        const entry = this.cache[key];
        if (!entry) return [];
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            delete this.cache[key];
            return [];
        }
        const value = entry.value;
        const returnable = (value instanceof Array) ? value : [value]
        return returnable;
    }

    public set(
        key: string, 
        value: any, 
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
