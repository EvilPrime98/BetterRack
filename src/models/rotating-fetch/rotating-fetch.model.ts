import {
    DEFAULT_BACKOFF_MS,
    DEFAULT_PROFILES,
    DEFAULT_RETRIES,
    DEFAULT_RETRY_STATUSES,
} from './constants';

import {
    CloudflareChallengeError,
    detectCloudflareChallenge,
    parseRetryAfterMs,
    type TCloudflareChallengeSignal,
} from './cloudflare';

import type {
    TBrowserProfile,
    TLogger,
    TRotatedFetchOptions,
    TRotatingFetchOptions,
    TRotationIdentity,
} from './types';

/** Only these statuses or an HTML body are worth reading for a challenge. */
const CHALLENGE_SNIFF_STATUSES = new Set([403, 429, 503]);

/** Cap on how much of a suspect body is read for challenge markers. */
const CHALLENGE_BODY_SNIFF_BYTES = 8192;

/** Do not read a suspect body larger than this into memory to sniff it. */
const CHALLENGE_BODY_SNIFF_MAX_BYTES = 1_000_000;


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

    /** The request origin, for a `Referer` header. Undefined for a non-URL. */
    private refererFor(
        url: string
    ): string | undefined {
        try {
            return `${new URL(url).origin}/`;
        } catch {
            return undefined;
        }
    }

    /**
     * Read a suspect response for Cloudflare challenge markers. Reads the
     * body only when the status or content type suggests an interstitial,
     * and never for a large payload.
     */
    private async sniffChallenge(
        res: Response
    ): Promise<TCloudflareChallengeSignal | null> {

        const headerSignal = detectCloudflareChallenge(res);
        if (headerSignal) return headerSignal;

        const contentType = res.headers.get('content-type') ?? '';
        const looksHtml = contentType.includes('text/html');
        const suspectStatus = CHALLENGE_SNIFF_STATUSES.has(res.status);
        if (!looksHtml && !suspectStatus) return null;

        const length = Number(res.headers.get('content-length') ?? 0);
        if (length > CHALLENGE_BODY_SNIFF_MAX_BYTES) return null;

        try {
            const body = (await res.clone().text()).slice(0, CHALLENGE_BODY_SNIFF_BYTES);
            return detectCloudflareChallenge(res, body);
        } catch {
            return null;
        }
    }

    async fetch(
        url: string,
        init: RequestInit = {},
        options: TRotatedFetchOptions = {},
    ): Promise<Response> {
        const retries = options.retries ?? DEFAULT_RETRIES;
        const retryStatuses = options.retryStatuses ?? DEFAULT_RETRY_STATUSES;
        const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
        const detectChallenge = options.detectChallenge ?? true;

        const referer = this.refererFor(url);

        let lastResponse: Response | undefined;
        let lastError: unknown;
        let lastChallenge: TCloudflareChallengeSignal | undefined;
        let retryAfterMs = 0;

        for (let attempt = 0; attempt <= retries; attempt++) {
            if (attempt > 0) {
                const expo = Math.min(2 ** attempt * backoffMs, 30_000) + Math.random() * 1000;
                const wait = Math.max(expo, retryAfterMs);
                retryAfterMs = 0;
                await new Promise(res => setTimeout(res, wait));
            }

            const identity = this.nextIdentity(referer ? { 'Referer': referer } : {});
            const requestInit: RequestInit = {
                ...init,
                headers: { ...identity.headers, ...(init.headers as Record<string, string>) },
            };

            try {
                const res = await fetch(url, requestInit);
                lastResponse = res;

                if (detectChallenge) {
                    const signal = await this.sniffChallenge(res);
                    if (signal) {
                        lastChallenge = signal;
                        retryAfterMs = parseRetryAfterMs(res);
                        this.log?.info(
                            `RotatingFetch: ${url} → Cloudflare challenge `
                            + `(status ${signal.status}, server ${signal.server ?? 'n/a'}, `
                            + `cf-ray ${signal.cfRay ?? 'n/a'}, cf-mitigated ${signal.cfMitigated ?? 'n/a'}, `
                            + `reason ${signal.reason}), retrying with a fresh identity `
                            + `(attempt ${attempt + 1}/${retries + 1})`,
                        );
                        continue;
                    }
                }

                if (retryStatuses.includes(res.status)) {
                    retryAfterMs = parseRetryAfterMs(res);
                    this.log?.info(`RotatingFetch: ${url} → HTTP ${res.status}, retrying with a fresh identity (attempt ${attempt + 1}/${retries + 1})`);
                    continue;
                }

                return res;
            } catch (err) {
                lastError = err;
                this.log?.error(
                    `RotatingFetch: ${url} threw ${err instanceof Error ? err.message : 'unknown error'}, retrying with a fresh identity (attempt ${attempt + 1}/${retries + 1})`,
                );
            }
        }

        if (detectChallenge && lastChallenge) {
            throw new CloudflareChallengeError(url, lastChallenge);
        }
        if (lastResponse) return lastResponse;
        throw lastError instanceof Error ? lastError : new Error(`RotatingFetch: all attempts failed for ${url}`);
    }

}
