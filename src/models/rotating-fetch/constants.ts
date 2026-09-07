import type { TBrowserProfile } from './types';

export const DEFAULT_RETRIES = 3;

export const DEFAULT_BACKOFF_MS = 2000;

export const DEFAULT_RETRY_STATUSES = [403, 408, 425, 429, 500, 502, 503, 504];

export const DEFAULT_PROFILES: TBrowserProfile[] = [
    {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        platform: '"Windows"',
        mobile: false,
        acceptLanguages: ['en-US,en;q=0.9', 'en-GB,en;q=0.8'],
    },
    {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="123", "Google Chrome";v="123", "Not.A/Brand";v="24"',
        platform: '"macOS"',
        mobile: false,
        acceptLanguages: ['en-US,en;q=0.9'],
    },
    {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
        secChUa: null,
        platform: '"Windows"',
        mobile: false,
        acceptLanguages: ['en-US,en;q=0.5', 'en-GB,en;q=0.7,en;q=0.3'],
    },
    {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0',
        secChUa: null,
        platform: '"macOS"',
        mobile: false,
        acceptLanguages: ['en-US,en;q=0.5'],
    },
    {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
        secChUa: null,
        platform: '"macOS"',
        mobile: false,
        acceptLanguages: ['en-US,en;q=0.9'],
    },
    {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        secChUa: '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
        platform: '"Windows"',
        mobile: false,
        acceptLanguages: ['en-US,en;q=0.9'],
    },
];
