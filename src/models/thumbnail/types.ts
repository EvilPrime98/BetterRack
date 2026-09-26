export type TCompressorModel = {
    listPages: ({ filePath }: {
        filePath: string;
    }) => Promise<string[]>,
    getPageStream: ({ filePath, entryName }: {
        filePath: string;
        entryName: string;
    }) => ReadableStream<Uint8Array>,
    extractPage: ({ filePath, outDir, entryName }: {
        filePath: string;
        outDir: string;
        entryName: string;
    }) => Promise<void>,
    getPageMimeType: (entryName: string) => string
}

export type TThumbnailEncoder = (inputPath: string, outputPath: string) => Promise<void>;

export type TLogger = {
    info: (...params: unknown[]) => void|Promise<void>;
    error: (...params: unknown[]) => void|Promise<void>;
}