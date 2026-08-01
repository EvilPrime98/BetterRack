import type { TDownloadLink, TDownloadModel, TProgressEvent } from '#src/types';
import { CUSTOM_USER_AGENT, REQUEST_DELAY } from '#src/data.ts';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';

export class DownloadModel implements TDownloadModel {

    downloadComic = async ({
        link,
        noRetry = false,
        outputDir,
        onProgress
    }: {
        link: TDownloadLink,
        rowIndex?: number,
        totalRows?: number,
        noRetry?: boolean,
        outputDir: string,
        onProgress?: (event: TProgressEvent) => void
    }): Promise<string | undefined> => {

        if (!link.downloadLink) return;

        console.log(`${link.title} is downloading`);
        onProgress?.({ type: 'preparing', title: link.title });

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
