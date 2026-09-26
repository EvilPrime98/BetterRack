import { describe, expect, test } from 'bun:test';
import { FFMPEG_ENV_VAR, resolveFfmpegPath, type TFfmpegLookup } from './ffmpeg-path';

const makeLookup = (overrides: Partial<TFfmpegLookup> = {}): TFfmpegLookup => ({
    env: {},
    which: () => null,
    exists: () => false,
    platform: 'linux',
    ...overrides
});

describe('resolveFfmpegPath', () => {

    test('prefers the FFMPEG_PATH binary over one on PATH', () => {
        const lookup = makeLookup({
            env: { [FFMPEG_ENV_VAR]: '/opt/app/bin/ffmpeg' },
            which: () => '/usr/bin/ffmpeg',
            exists: filePath => filePath === '/opt/app/bin/ffmpeg'
        });

        expect(resolveFfmpegPath(lookup)).toBe('/opt/app/bin/ffmpeg');
    });

    test('falls through to PATH when FFMPEG_PATH points to a missing file', () => {
        const lookup = makeLookup({
            env: { [FFMPEG_ENV_VAR]: '/gone/ffmpeg' },
            which: name => name === 'ffmpeg' ? '/usr/bin/ffmpeg' : null
        });

        expect(resolveFfmpegPath(lookup)).toBe('/usr/bin/ffmpeg');
    });

    test('uses PATH when FFMPEG_PATH is not set', () => {
        const lookup = makeLookup({ which: () => '/home/me/bin/ffmpeg' });

        expect(resolveFfmpegPath(lookup)).toBe('/home/me/bin/ffmpeg');
    });

    test('uses the POSIX fallback locations when neither is set', () => {
        const lookup = makeLookup({ exists: filePath => filePath === '/opt/homebrew/bin/ffmpeg' });

        expect(resolveFfmpegPath(lookup)).toBe('/opt/homebrew/bin/ffmpeg');
    });

    test('uses the Windows fallback locations on win32', () => {
        const lookup = makeLookup({
            platform: 'win32',
            exists: filePath => filePath === 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe'
        });

        expect(resolveFfmpegPath(lookup)).toBe('C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe');
    });

    test('does not use POSIX fallbacks on win32', () => {
        const lookup = makeLookup({ platform: 'win32', exists: filePath => filePath === '/usr/bin/ffmpeg' });

        expect(() => resolveFfmpegPath(lookup)).toThrow('ffmpeg executable not found');
    });

    test('throws a clear error when ffmpeg cannot be found anywhere', () => {
        expect(() => resolveFfmpegPath(makeLookup())).toThrow(
            `ffmpeg executable not found. Set ${FFMPEG_ENV_VAR} to an ffmpeg binary`
        );
    });

    test('names the missing FFMPEG_PATH target in the error', () => {
        const lookup = makeLookup({ env: { [FFMPEG_ENV_VAR]: '/gone/ffmpeg' } });

        expect(() => resolveFfmpegPath(lookup)).toThrow(`${FFMPEG_ENV_VAR} points to "/gone/ffmpeg", which does not exist.`);
    });

});
