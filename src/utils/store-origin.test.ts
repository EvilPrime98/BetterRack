import { describe, expect, test } from 'bun:test';
import { deriveStoreOrigin } from './store-origin';

describe('deriveStoreOrigin', () => {

    test('returns the origin of an API url with a path', () => {
        expect(deriveStoreOrigin('https://example.com/wp-json/wp/v2')).toBe('https://example.com');
    });

    test('drops a trailing slash and surrounding whitespace', () => {
        expect(deriveStoreOrigin('  https://example.com/wp-json/wp/v2/  ')).toBe('https://example.com');
    });

    test('keeps a non-default port', () => {
        expect(deriveStoreOrigin('http://localhost:8080/wp-json/wp/v2')).toBe('http://localhost:8080');
    });

    test('returns an empty string for an empty api url', () => {
        expect(deriveStoreOrigin('')).toBe('');
    });

    test('returns an empty string for a malformed api url', () => {
        expect(deriveStoreOrigin('not a url')).toBe('');
    });

});
