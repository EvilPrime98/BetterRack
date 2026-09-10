import { afterEach, describe, expect, test } from 'bun:test';
import {
    CloudflareChallengeError,
    detectCloudflareChallenge,
    isCloudflareChallengeError,
    parseRetryAfterMs,
} from './cloudflare';
import { RotatingFetchModel } from './rotating-fetch.model';

function res(
    {
        status = 200,
        headers = {},
        body = '',
    }: {
        status?: number;
        headers?: Record<string, string>;
        body?: string;
    }
): Response {
    const h = new Headers(headers);
    const response = {
        ok: status >= 200 && status < 300,
        status,
        url: 'https://host.test/resource',
        headers: h,
        clone() { return response; },
        async text() { return body; },
    };
    return response as unknown as Response;
}

describe('detectCloudflareChallenge', () => {

    test('flags cf-mitigated: challenge regardless of status or body', () => {
        const signal = detectCloudflareChallenge(res({ status: 403, headers: { 'cf-mitigated': 'challenge' } }));
        expect(signal?.reason).toBe('cf-mitigated-header');
    });

    test('flags a challenge marker in the body', () => {
        const signal = detectCloudflareChallenge(
            res({ status: 200, headers: { server: 'cloudflare' } }),
            '<title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/x"></script>',
        );
        expect(signal?.reason).toBe('challenge-body');
    });

    test('does not flag a plain 403 from behind Cloudflare with no marker', () => {
        expect(detectCloudflareChallenge(
            res({ status: 403, headers: { server: 'cloudflare', 'cf-ray': 'abc123' } }),
            '{"error":"forbidden"}',
        )).toBeNull();
    });

    test('does not flag a clean 200', () => {
        expect(detectCloudflareChallenge(res({ status: 200, headers: { server: 'cloudflare' } }), 'binary')).toBeNull();
    });

});

describe('parseRetryAfterMs', () => {

    test('parses the delay-seconds form and caps it', () => {
        expect(parseRetryAfterMs(res({ headers: { 'retry-after': '5' } }))).toBe(5000);
        expect(parseRetryAfterMs(res({ headers: { 'retry-after': '9999' } }))).toBe(30_000);
    });

    test('returns 0 when the header is absent or unparseable', () => {
        expect(parseRetryAfterMs(res({}))).toBe(0);
        expect(parseRetryAfterMs(res({ headers: { 'retry-after': 'soon' } }))).toBe(0);
    });

});

describe('isCloudflareChallengeError', () => {

    test('recognises the error class and its structural brand', () => {
        const err = new CloudflareChallengeError('https://host.test/x', {
            reason: 'cf-mitigated-header', status: 403, server: 'cloudflare', cfRay: null, cfMitigated: 'challenge',
        });
        expect(isCloudflareChallengeError(err)).toBe(true);
        expect(isCloudflareChallengeError({ isCloudflareChallenge: true })).toBe(true);
        expect(isCloudflareChallengeError(new Error('nope'))).toBe(false);
    });

});

describe('RotatingFetchModel.fetch — challenge handling', () => {

    const realFetch = globalThis.fetch;
    afterEach(() => { globalThis.fetch = realFetch; });

    test('throws CloudflareChallengeError after retries do not clear the challenge', async () => {
        let calls = 0;
        globalThis.fetch = (async () => {
            calls++;
            return res({
                status: 403,
                headers: { 'content-type': 'text/html', server: 'cloudflare' },
                body: '<title>Just a moment...</title><div class="cf-challenge"></div>',
            });
        }) as unknown as typeof fetch;

        const model = new RotatingFetchModel();

        await expect(
            model.fetch('https://host.test/resource', {}, { retries: 2, backoffMs: 0 })
        ).rejects.toBeInstanceOf(CloudflareChallengeError);

        expect(calls).toBe(3); // first try + 2 retries, each with a fresh identity
    });

    test('returns the response when no challenge is present', async () => {
        globalThis.fetch = (async () => res({ status: 200, headers: { 'content-type': 'application/json' }, body: '{}' })) as unknown as typeof fetch;

        const model = new RotatingFetchModel();
        const out = await model.fetch('https://host.test/resource', {}, { retries: 1, backoffMs: 0 });

        expect(out.status).toBe(200);
    });

    test('detectChallenge:false passes a challenge response straight through', async () => {
        globalThis.fetch = (async () => res({
            status: 403,
            headers: { 'content-type': 'text/html', server: 'cloudflare' },
            body: '<title>Just a moment...</title>',
        })) as unknown as typeof fetch;

        const model = new RotatingFetchModel();
        const out = await model.fetch('https://host.test/resource', {}, { retries: 0, backoffMs: 0, detectChallenge: false });

        expect(out.status).toBe(403);
    });

});
