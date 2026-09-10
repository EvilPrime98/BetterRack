import { createWriteStream } from 'fs';
import { mkdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { HOST as PIXELDRAIN_HOST } from '../pixel-drain/constants';
import { RotatingFetchModel } from '../rotating-fetch/rotating-fetch.model';
import {
    CLOUDFLARE_CHALLENGE_USER_MESSAGE,
    CloudflareChallengeError,
    detectCloudflareChallenge,
    isCloudflareChallengeError,
} from '../rotating-fetch/cloudflare';
import type { PackExtractor } from './pack-extractor.model';
import type { TDownloadLink, TLogger, TProgressEvent } from './types';

const REQUEST_DELAY = 3 * 1000;

const MAX_NETWORK_RETRIES = 3;

const RETRY_BACKOFF_MS = 2000;

const RETRY_BACKOFF_CAP_MS = 30_000;

const CUSTOM_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class DownloadModel {

    private log: TLogger|undefined;
    private packExtractor: PackExtractor|undefined;
    private retry: { maxRetries: number; backoffMs: number; backoffCapMs: number };
    private rotatingFetch: RotatingFetchModel;

    constructor(
        log?: TLogger,
        packExtractor?: PackExtractor,
        retryOpts: { maxRetries?: number; backoffMs?: number; backoffCapMs?: number } = {},
        rotatingFetch?: RotatingFetchModel
    ){
        this.log = log
        this.packExtractor = packExtractor
        this.retry = {
            maxRetries: retryOpts.maxRetries ?? MAX_NETWORK_RETRIES,
            backoffMs: retryOpts.backoffMs ?? RETRY_BACKOFF_MS,
            backoffCapMs: retryOpts.backoffCapMs ?? RETRY_BACKOFF_CAP_MS,
        }
        this.rotatingFetch = rotatingFetch ?? new RotatingFetchModel({ logger: log })
    }

    private isPixelDrainUrl(
        url: string
    ): boolean {
        try {
            const { hostname } = new URL(url);
            return hostname === PIXELDRAIN_HOST || hostname.endsWith(`.${PIXELDRAIN_HOST}`);
        } catch {
            return false;
        }
    }

    private fetchSource = (
        url: string
    ): Promise<Response> => {
        if (this.isPixelDrainUrl(url)) {
            return this.rotatingFetch.fetch(url, {
                method: 'GET',
                headers: { 'content-type': 'application/octet-stream' },
            });
        }
        return fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': CUSTOM_USER_AGENT,
                'content-type': 'application/octet-stream',
            },
        });
    }

    private sanitizeFilename(
        name: string
    ): string {
        return name
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[. ]+$/, '');
    }

    private filenameFromDisposition(
        header: string | null
    ): string | undefined {
        if (!header) return undefined;
        const encoded = header.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
        if (encoded?.[1]) {
            try {
                return decodeURIComponent(encoded[1].trim().replace(/^["']|["']$/g, ''));
            } catch { /* fall through to the plain form */ }
        }
        const plain = header.match(/filename="?([^";]+)"?/i);
        return plain?.[1]?.trim() || undefined;
    }

    private resolveFilename(
        response: Response,
        link: TDownloadLink
    ): string {
        const fromDisposition = this.filenameFromDisposition(
            response.headers.get('content-disposition')
        );
        const fromUrl = decodeURIComponent(
            (response.url.split('/').pop() ?? '').split(/[?#]/)[0]!
        );
        const raw = this.isPixelDrainUrl(link.downloadLink ?? '')
            ? (fromDisposition || link.title || fromUrl)
            : (fromUrl || fromDisposition || link.title);
        return this.sanitizeFilename(raw) || 'download';
    }

    private proxyLogger(quiet: boolean) {
        return {
            info: (message: string) => {
                if (!quiet) {
                    this.log?.info(message);
                }
            },

            error: (message: string) => {
                if (!quiet) {
                    this.log?.error(message);
                }
            }
        };
    }

    downloadComic = async ({
        link,
        noRetry = false,
        outputDir,
        onProgress,
        quiet = false
    }: {
        link: TDownloadLink,
        rowIndex?: number,
        totalRows?: number,
        noRetry?: boolean,
        outputDir: string,
        onProgress?: (event: TProgressEvent) => void,
        quiet?: boolean
    }): Promise<string | undefined> => {

        if (!link.downloadLink) return;

        this.proxyLogger(quiet).info(`${link.title} is downloading`);
        
        onProgress?.({ 
            type: 'preparing', 
            title: link.title 
        });

        let dest: string | undefined;

        try {

            // Treat a thrown fetch or stream error as transient. Try again
            // from the first byte, up to the retry budget, with exponential
            // backoff. streamToDisk retries a non-2xx status with the same budget.
            let lastErr: unknown;

            for (let attempt = 0; attempt <= this.retry.maxRetries; attempt++) {

                if (attempt > 0) {
                    const base = Math.min(2 ** attempt * this.retry.backoffMs, this.retry.backoffCapMs);
                    const backoff = base + Math.random() * Math.min(this.retry.backoffMs, 1000);
                    onProgress?.({
                        type: 'retrying',
                        title: link.title,
                        reason: 'network',
                        delaySec: Math.round(backoff / 1000)
                    });
                    await new Promise(r => setTimeout(r, backoff));
                }

                try {
                    // streamToDisk removes its own partial file on failure.
                    dest = await this.streamToDisk({ link, noRetry, outputDir, onProgress, quiet });
                    lastErr = undefined;
                    break;
                } catch (err) {
                    // A Cloudflare challenge or a no-retry request does not
                    // resolve when you try again.
                    if (isCloudflareChallengeError(err) || noRetry === true) throw err;
                    lastErr = err;
                    this.proxyLogger(quiet).error(
                        `Download attempt ${attempt + 1}/${this.retry.maxRetries + 1} for ${link.title} failed: `
                        + (err instanceof Error ? err.message : 'unknown error')
                    );
                }
            }

            if (lastErr) throw lastErr;

            // Capture the name now. Pack extraction can change dest to a directory.
            const filename = dest ? dest.split(/[\\/]/).pop()! : link.title;

            if (this.packExtractor && dest) {
                try {
                    const { size } = await stat(dest);
                    if (this.packExtractor.shouldInspect(dest, size)) {
                        const result = await this.packExtractor.extractPack({
                            filePath: dest,
                            outputDir,
                            onProgress: (done, total) =>
                                onProgress?.({ type: 'extracting', title: link.title, done, total })
                        });
                        if (result.action === 'extracted') dest = result.destDir ?? dest;
                        if (result.action === 'renamed') dest = result.renamedTo ?? dest;
                    }
                } catch (err) {
                    // A failed unpack keeps the wrapper on disk. The library
                    // still rescans below, so the download is not lost.
                    this.proxyLogger(quiet).error(
                        `Pack extraction failed: ${err instanceof Error ? err.message : 'unknown error'}`
                    );
                }
            }

            onProgress?.({ type: 'done', filename });

            return dest;

        } catch (error) {

            const message = isCloudflareChallengeError(error)
                ? CLOUDFLARE_CHALLENGE_USER_MESSAGE
                : error instanceof Error ? error.message : 'Failed to download';

            onProgress?.({ type: 'error', message });

        }

    }

    private streamToDisk = async ({
        link,
        noRetry,
        outputDir,
        onProgress,
        quiet
    }: {
        link: TDownloadLink,
        noRetry: boolean,
        outputDir: string,
        onProgress?: (event: TProgressEvent) => void,
        quiet: boolean
    }): Promise<string> => {

        let response: Response;
        let statusRetries = 0;

        while (true) {
            response = await this.fetchSource(link.downloadLink!);
            const contentType = response.headers.get('content-type') ?? '';
            const challengeBody = contentType.includes('text/html')
                ? await response.clone().text().catch(() => undefined)
                : undefined;
            const challenge = detectCloudflareChallenge(response, challengeBody?.slice(0, 8192));
            if (challenge) {
                this.proxyLogger(quiet).error(
                    `${CLOUDFLARE_CHALLENGE_USER_MESSAGE} `
                    + `(status ${challenge.status}, reason ${challenge.reason})`
                );
                throw new CloudflareChallengeError(link.downloadLink!, challenge);
            }
            if (response.ok) break;
            // A persistent non-2xx status must terminate, not loop forever.
            if (noRetry === true || statusRetries >= this.retry.maxRetries) {
                throw new Error(`HTTP ${response.status}`);
            }
            statusRetries++;
            onProgress?.({
                type: 'retrying',
                title: link.title,
                status: response.status,
                reason: 'http',
                delaySec: REQUEST_DELAY / 1000
            });
            await new Promise(r => setTimeout(r, REQUEST_DELAY));
        }

        const filename = this.resolveFilename(response, link);
        const dest = join(outputDir, filename);
        const total = Number(response.headers.get('content-length') ?? 0);
        const totalMB = (total / 1024 / 1024).toFixed(1);

        await mkdir(outputDir, { recursive: true });

        const reader = response.body!.getReader();
        const fileStream = createWriteStream(dest);
        let received = 0;

        try {
            await new Promise<void>((resolve, reject) => {
                fileStream.on('error', reject);
                const pump = async () => {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) { fileStream.end(); break; }
                            received += value.length;
                            const receivedMB = (received / 1024 / 1024).toFixed(1);
                            const percent = total ? Math.floor((received / total) * 100) : 0;
                            onProgress?.({ type: 'progress', title: link.title, percent, receivedMB, totalMB });
                            if (!fileStream.write(value)) {
                                await new Promise(r => fileStream.once('drain', r));
                            }
                        }
                        fileStream.once('finish', resolve);
                    } catch (err) { reject(err); }
                };
                pump();
            });
        } catch (err) {
            // A broken transfer leaves a truncated file on disk. Wait for the
            // stream to release the handle. Then delete the file, before the
            // caller retries or reports a terminal failure.
            fileStream.destroy();
            if (!fileStream.closed) {
                await new Promise<void>(res => fileStream.once('close', () => res()));
            }
            await unlink(dest).catch(() => {});
            throw err;
        }

        return dest;
    }

    downloadComicBundle = async ({
        postLinks,
        noRetry = false,
        outputDir
    }: {
        postLinks: TDownloadLink[],
        noRetry?: boolean,
        outputDir: string
    }) => {

        await Promise.all(postLinks.map((comic, i) =>
            this.downloadComic({
                link: comic,
                rowIndex: i,
                totalRows: postLinks.length,
                noRetry,
                outputDir
            })
        ));

    }

}
