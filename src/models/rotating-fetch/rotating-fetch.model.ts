import {
    DEFAULT_BACKOFF_MS,
    DEFAULT_PROFILES,
    DEFAULT_RETRIES,
    DEFAULT_RETRY_STATUSES,
} from './constants';

import type {
    TBrowserProfile,
    TLogger,
    TRotatedFetchOptions,
    TRotatingFetchOptions,
    TRotationIdentity,
} from './types';


export class RotatingFetchModel {

    private profiles: TBrowserProfile[];
    private baseHeaders: Record<string, string>;
    private log: TLogger | undefined;

    constructor(
        options: TRotatingFetchOptions = {}
    ) {
        this.profiles = options.profiles?.length ? options.profiles : DEFAULT_PROFILES;
        this.baseHeaders = options.baseHeaders ?? {};
        this.log = options.logger;
    }

    private pick<T>(
        list: T[]
    ): T {
        return list[Math.floor(Math.random() * list.length)]!;
    }

    buildHeaders(
        profile: TBrowserProfile = this.pick(this.profiles),
        overrides: Record<string, string> = {},
    ): Record<string, string> {
        const headers: Record<string, string> = {
            'User-Agent': profile.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': this.pick(profile.acceptLanguages),
            'Accept-Encoding': 'gzip, deflate, br',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'DNT': '1',
            'Connection': 'keep-alive',
        };

        if (profile.secChUa) {
            headers['Sec-CH-UA'] = profile.secChUa;
            headers['Sec-CH-UA-Mobile'] = profile.mobile ? '?1' : '?0';
            headers['Sec-CH-UA-Platform'] = profile.platform;
        }

        return { ...headers, ...this.baseHeaders, ...overrides };
    }

    nextIdentity(
        headerOverrides: Record<string, string> = {}
    ): TRotationIdentity {
        const profile = this.pick(this.profiles);
        return {
            profile,
            headers: this.buildHeaders(profile, headerOverrides),
        };
    }

    async fetch(
        url: string,
        init: RequestInit = {},
        options: TRotatedFetchOptions = {},
    ): Promise<Response> {
        const retries = options.retries ?? DEFAULT_RETRIES;
        const retryStatuses = options.retryStatuses ?? DEFAULT_RETRY_STATUSES;
        const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;

        let lastResponse: Response | undefined;
        let lastError: unknown;

        for (let attempt = 0; attempt <= retries; attempt++) {
            init.signal?.throwIfAborted();
            if (attempt > 0) {
                const wait = Math.min(2 ** attempt * backoffMs, 30_000) + Math.random() * 1000;
                await new Promise(res => setTimeout(res, wait));
            }

            const identity = this.nextIdentity();
            const requestInit: RequestInit = {
                ...init,
                headers: { ...identity.headers, ...(init.headers as Record<string, string>) },
            };

            try {
                const res = await fetch(url, requestInit);
                lastResponse = res;

                if (retryStatuses.includes(res.status)) {
                    this.log?.info(`RotatingFetch: ${url} → HTTP ${res.status}, retrying with a fresh identity (attempt ${attempt + 1}/${retries + 1})`);
                    continue;
                }

                return res;
            } catch (err) {
                if (init.signal?.aborted) throw err;
                lastError = err;
                this.log?.error(
                    `RotatingFetch: ${url} threw ${err instanceof Error ? err.message : 'unknown error'}, retrying with a fresh identity (attempt ${attempt + 1}/${retries + 1})`,
                );
            }
        }

        if (lastResponse) return lastResponse;
        throw lastError instanceof Error ? lastError : new Error(`RotatingFetch: all attempts failed for ${url}`);
    }

}
