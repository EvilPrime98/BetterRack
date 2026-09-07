export type TLogger = {
    info: (log: string) => void | Promise<void>;
    error: (log: string) => void | Promise<void>;
};

/**
 * A matched set of client fingerprint headers. The User-Agent and Client
 * Hints headers must agree. Keep them in one profile.
 */
export type TBrowserProfile = {
    userAgent: string;
    /** The `Sec-CH-UA` value. Use null for an engine that does not send Client Hints. */
    secChUa: string | null;
    /** The `Sec-CH-UA-Platform` value, for example `"Windows"`. */
    platform: string;
    mobile: boolean;
    acceptLanguages: string[];
};

export type TRotatingFetchOptions = {
    /** If set, this list replaces the built-in browser profile pool. */
    profiles?: TBrowserProfile[];
    /** The model merges these header overrides into every request it sends. */
    baseHeaders?: Record<string, string>;
    logger?: TLogger;
};

/** One rotation slot: the browser profile and the headers to send with it. */
export type TRotationIdentity = {
    profile: TBrowserProfile;
    headers: Record<string, string>;
};

export type TRotatedFetchOptions = {
    /** The number of extra attempts after the first try. Each attempt uses a fresh identity. The default is 3. */
    retries?: number;
    /** The response statuses that trigger a retry with a fresh identity. */
    retryStatuses?: number[];
    /** The base backoff between attempts, in ms. The backoff grows exponentially and adds random jitter. */
    backoffMs?: number;
};
