/**
 * Cloudflare challenge detection for the outbound fetch path.
 *
 * A challenge response is not a transport failure and not a plain non-2xx
 * status. It means the host gates automated clients behind an interstitial.
 * Callers need to tell it apart from "no link found" or "HTTP 500" so the
 * user gets the real reason.
 */

/** Body substrings a Cloudflare interstitial reliably carries. */
export const CLOUDFLARE_CHALLENGE_MARKERS = [
    'just a moment',
    'attention required',
    'challenge-platform',
    'cf-challenge',
    'cf_chl_opt',
    '/cdn-cgi/challenge-platform/',
    'turnstile',
] as const;

export type TCloudflareChallengeSignal = {
    reason: 'cf-mitigated-header' | 'challenge-body';
    status: number;
    server: string | null;
    cfRay: string | null;
    cfMitigated: string | null;
};

function hasMarker(
    body: string
): boolean {
    const lower = body.toLowerCase();
    return CLOUDFLARE_CHALLENGE_MARKERS.some(marker => lower.includes(marker));
}

/**
 * Classify a response as a Cloudflare challenge, or return null.
 *
 * Two signals, both conservative:
 *  - `cf-mitigated: challenge` — Cloudflare's own marker for an interstitial.
 *  - a challenge marker in the body text — catches the "Just a moment…" page
 *    whatever status it carries.
 *
 * A Cloudflare `Server` header or a `cf-ray` alone is not enough. Cloudflare
 * fronts a large share of the web. A plain 403/503 from behind it is more
 * often a real auth failure or an origin outage than a challenge.
 *
 * `bodyText` is optional. Pass it when the body is already read or cloned.
 */
export function detectCloudflareChallenge(
    res: Pick<Response, 'status' | 'headers'>,
    bodyText?: string,
): TCloudflareChallengeSignal | null {

    const base = {
        status: res.status,
        server: res.headers.get('server'),
        cfRay: res.headers.get('cf-ray'),
        cfMitigated: res.headers.get('cf-mitigated'),
    };

    if (base.cfMitigated?.toLowerCase() === 'challenge') {
        return { reason: 'cf-mitigated-header', ...base };
    }

    if (bodyText !== undefined && hasMarker(bodyText)) {
        return { reason: 'challenge-body', ...base };
    }

    return null;
}

/**
 * Thrown when the outbound fetch path receives a Cloudflare challenge and a
 * fresh client fingerprint did not clear it. Distinct from a transport error
 * or a plain non-2xx status so callers can report the real cause.
 */
export class CloudflareChallengeError extends Error {

    readonly isCloudflareChallenge = true;
    readonly url: string;
    readonly status: number;
    readonly server: string | null;
    readonly cfRay: string | null;
    readonly cfMitigated: string | null;

    constructor(
        url: string,
        signal: TCloudflareChallengeSignal,
    ) {
        super(
            `Cloudflare challenge for ${url} `
            + `(status ${signal.status}, reason ${signal.reason}). `
            + `The host is blocking automated downloads.`
        );
        this.name = 'CloudflareChallengeError';
        this.url = url;
        this.status = signal.status;
        this.server = signal.server;
        this.cfRay = signal.cfRay;
        this.cfMitigated = signal.cfMitigated;
    }
}

/** Message shown to the user when a challenge blocks a download. */
export const CLOUDFLARE_CHALLENGE_USER_MESSAGE =
    'Cloudflare challenge — this host is blocking automated downloads. '
    + 'Try again later, or open the comic in a browser.';

/**
 * Structural check for a challenge error. Survives the cross-module identity
 * mismatch that a bare `instanceof` hits when the class is loaded twice.
 */
export function isCloudflareChallengeError(
    err: unknown
): err is CloudflareChallengeError {
    return err instanceof CloudflareChallengeError
        || (
            typeof err === 'object'
            && err !== null
            && (err as { isCloudflareChallenge?: unknown }).isCloudflareChallenge === true
        );
}

/**
 * Parse a `Retry-After` header into a millisecond delay, capped at 30s.
 * Accepts the delay-seconds form and the HTTP-date form. Returns 0 when the
 * header is absent or unparseable.
 */
export function parseRetryAfterMs(
    res: Pick<Response, 'headers'>,
    capMs = 30_000,
): number {
    const raw = res.headers.get('retry-after');
    if (!raw) return 0;

    const seconds = Number(raw);
    if (Number.isFinite(seconds)) return Math.min(Math.max(seconds, 0) * 1000, capMs);

    const date = Date.parse(raw);
    if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), capMs);

    return 0;
}
