export type TPixelDrainRef = {
    kind: 'file' | 'list';
    id: string;
};

export type TPixelDrainFile = {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    canDownload: boolean;
    /** A direct URL with the download flag set. It streams the file bytes. */
    downloadLink: string;
};

export type TFileInfoResponse = {
    success: boolean;
    id: string;
    name: string;
    size: number;
    mime_type: string;
    can_download: boolean;
    message?: string;
};

export type TListResponse = {
    success: boolean;
    id: string;
    title?: string;
    files?: Array<{
        id: string;
        name: string;
        size: number;
        mime_type: string;
        can_download: boolean;
    }>;
    message?: string;
};