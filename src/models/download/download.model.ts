import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import type { TDownloadLink, TLogger, TProgressEvent } from './types';

const REQUEST_DELAY = 3 * 1000;

const CUSTOM_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CLOUDFLARE_CHALLENGE_MARKERS = [
    'cloudflare',
    'just a moment',
    'attention required',
    'challenge-platform',
    'turnstile',
    'cf-challenge',
];

export class DownloadModel {

    private log: TLogger|undefined;

    constructor(
        log?: TLogger
    ){  
        this.log = log
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

    private isCloudflareChallengePage(
        content: string
    ): boolean {
        const lower = content.toLowerCase();
        return CLOUDFLARE_CHALLENGE_MARKERS.some(marker => lower.includes(marker));
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

            let response: Response;
            while (true) {
                response = await fetch(link.downloadLink, {
                    method: 'GET',
                    headers: {
                        'User-Agent': CUSTOM_USER_AGENT,
                        'content-type': 'application/octet-stream'
                    }
                });
                const contentType = response.headers.get('content-type') ?? '';
                if (contentType.includes('text/html')) {
                    const preview = await response.clone().text();
                    if (this.isCloudflareChallengePage(preview)) {
                        const error = 'Cloudflare challenge detected. Open the comic in a browser or use a browser-side download path.';
                        this.proxyLogger(quiet).error(error);
                        throw new Error(error);
                    }
                }
                if (response.ok) break;
                if (noRetry === true) throw new Error(`HTTP ${response.status}`);
                onProgress?.({ type: 'retrying', title: link.title, status: response.status, delaySec: REQUEST_DELAY / 1000 });
                await new Promise(r => setTimeout(r, REQUEST_DELAY));
            }

            const filename = decodeURIComponent(response.url.split('/').pop()!);
            dest = join(outputDir, filename);
            const total = Number(response.headers.get('content-length') ?? 0);
            const totalMB = (total / 1024 / 1024).toFixed(1);

            await mkdir(outputDir, { recursive: true });

            const reader = response.body!.getReader();
            const fileStream = createWriteStream(dest);
            let received = 0;

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

            onProgress?.({ type: 'done', filename });

            return dest;

        } catch (error) {

            onProgress?.({ type: 'error', message: error instanceof Error ? error.message : 'Failed to download' });

        }

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
