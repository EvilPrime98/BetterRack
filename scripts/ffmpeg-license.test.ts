import { describe, expect, test } from 'bun:test';
import { licenseViolations } from './ffmpeg-license';

const LGPL_OUTPUT = 'ffmpeg is free software; you can redistribute it and/or modify\nit under the terms of the GNU Lesser General Public License, version 3.';
const GPL_OUTPUT = 'it under the terms of the GNU General Public License as published by the Free Software Foundation.';

const versionOutput = (flags: string): string =>
    `ffmpeg version n8.1.3\nbuilt with gcc\nconfiguration: ${flags}\nlibavutil 60. 26.103`;

describe('licenseViolations', () => {

    test('accepts an LGPL build with libwebp', () => {
        const output = versionOutput('--enable-version3 --enable-libwebp --enable-libopus');

        expect(licenseViolations(output, LGPL_OUTPUT)).toEqual([]);
    });

    test('accepts the configuration line when it is indented (as printed by -hide_banner -version)', () => {
        const output = '  configuration: --enable-libwebp';

        expect(licenseViolations(output, LGPL_OUTPUT)).toEqual([]);
    });

    test('rejects --enable-gpl', () => {
        const output = versionOutput('--enable-gpl --enable-libx264 --enable-libwebp');

        expect(licenseViolations(output, LGPL_OUTPUT)).toEqual(['build was configured with --enable-gpl']);
    });

    test('rejects --enable-nonfree', () => {
        const output = versionOutput('--enable-nonfree --enable-libfdk-aac --enable-libwebp');

        expect(licenseViolations(output, LGPL_OUTPUT)).toEqual(['build was configured with --enable-nonfree']);
    });

    test('does not mistake a longer flag for --enable-gpl', () => {
        const output = versionOutput('--enable-gplv3-helper --enable-libwebp');

        expect(licenseViolations(output, LGPL_OUTPUT)).toEqual([]);
    });

    test('rejects a build without libwebp', () => {
        const output = versionOutput('--enable-version3');

        expect(licenseViolations(output, LGPL_OUTPUT)).toEqual(['build lacks --enable-libwebp']);
    });

    test('rejects a license report that is not LGPL', () => {
        const output = versionOutput('--enable-libwebp');

        expect(licenseViolations(output, GPL_OUTPUT)).toEqual(['`ffmpeg -L` does not report the GNU Lesser General Public License']);
    });

    test('reports every violation at once', () => {
        const output = versionOutput('--enable-gpl --enable-nonfree');

        expect(licenseViolations(output, GPL_OUTPUT)).toHaveLength(4);
    });

    test('rejects output with no configuration line', () => {
        expect(licenseViolations('ffmpeg version n8.1.3', LGPL_OUTPUT)).toEqual(['`ffmpeg -version` printed no configuration line']);
    });

});
