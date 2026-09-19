import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { storeApiUrlGuard } from './storeApiUrlGuard';

function buildApp(apiUrl: string) {
    const app = new Hono();
    app.use('/store/*', storeApiUrlGuard({ getAppSettings: () => ({ apiUrl }) }));
    app.get('/store/posts', (c) => c.json({ ok: true }));
    return app;
}

describe('storeApiUrlGuard', () => {

    test('rejects the request with 409 when the api url is empty', async () => {
        const res = await buildApp('').request('/store/posts');

        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({
            error: true,
            message: 'Store API URL is not configured. Set it in Settings.'
        });
    });

    test('rejects the request with 409 when the api url is only whitespace', async () => {
        const res = await buildApp('   ').request('/store/posts');

        expect(res.status).toBe(409);
    });

    test('rejects the request with 409 when the api url is malformed', async () => {
        const res = await buildApp('not a url').request('/store/posts');

        expect(res.status).toBe(409);
    });

    test('lets the request through when the api url is valid', async () => {
        const res = await buildApp('https://example.com/wp-json/wp/v2').request('/store/posts');

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
    });

});
