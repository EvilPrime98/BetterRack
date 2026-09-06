export type TDownloadLink = {
    title: string;
    downloadLink: string|null;
}

export type TProgressEvent =
    | { type: 'preparing'; title: string }
    | { type: 'retrying'; title: string; status: number; delaySec: number }
    | { type: 'progress'; title: string; percent: number; receivedMB: string; totalMB: string }
    | { type: 'extracting'; title: string; done: number; total: number }
    | { type: 'done'; filename: string }
    | { type: 'error'; message: string }

export type TLogger = {
    info: (log:string) => void | Promise<void>;
    error: (log:string) => void | Promise<void>;
}