import { RotatingFetchModel } from '../rotating-fetch/rotating-fetch.model';
import type { TRotatingFetchOptions } from '../rotating-fetch/types';
import { API, BARE_ID_RE, FILE_RE, LIST_RE } from './constants';
import type { TFileInfoResponse, TListResponse, TPixelDrainFile, TPixelDrainRef } from './types';

export class PixelDrainModel {

    private apiKey: string | undefined;
    private ip: RotatingFetchModel;

    constructor(
        apiKey?: string,
        rotation: TRotatingFetchOptions = {},
    ) {
        this.apiKey = apiKey;
        this.ip = new RotatingFetchModel(rotation);
    }

    private parseRef(
        input: string
    ): TPixelDrainRef {
        const trimmed = input.trim();
        const list = trimmed.match(LIST_RE);
        if (list) return { kind: 'list', id: list[1] };
        const file = trimmed.match(FILE_RE);
        if (file) return { kind: 'file', id: file[1] };
        if (BARE_ID_RE.test(trimmed)) return { kind: 'file', id: trimmed };
        throw new Error(`Not a PixelDrain URL: ${input}`);
    }

    private directDownloadLink(
        id: string
    ): string {
        return `${API}/file/${id}?download`;
    }

    private authHeaders(): Record<string, string> {
        if (!this.apiKey) return {};
        const token = Buffer.from(`:${this.apiKey}`).toString('base64');
        return { Authorization: `Basic ${token}` };
    }

    private async unhashLink(url: string) {
        const finalUrl = (await this.ip.fetch(url)).url;
        return finalUrl;
    }

    async getFileInfo(
        idOrUrl: string
    ): Promise<TPixelDrainFile> {
        const { id } = this.parseRef(idOrUrl);
        const res = await this.ip.fetch(`${API}/file/${id}/info`, { headers: this.authHeaders() });
        if (!res.ok) throw new Error(`PixelDrain info failed for ${id}: HTTP ${res.status}`);
        const body = await res.json() as TFileInfoResponse;
        if (!body.success) throw new Error(`PixelDrain: ${body.message ?? 'file unavailable'}`);
        return {
            id: body.id,
            name: body.name,
            size: body.size,
            mimeType: body.mime_type,
            canDownload: body.can_download,
            downloadLink: this.directDownloadLink(body.id),
        };
    }

    async getList(
        idOrUrl: string
    ): Promise<TPixelDrainFile[]> {
        const { id } = this.parseRef(idOrUrl);
        const res = await this.ip.fetch(`${API}/list/${id}`, { headers: this.authHeaders() });
        if (!res.ok) throw new Error(`PixelDrain list failed for ${id}: HTTP ${res.status}`);
        const body = await res.json() as TListResponse;
        if (!body.success) throw new Error(`PixelDrain: ${body.message ?? 'list unavailable'}`);
        return (body.files ?? []).map(file => ({
            id: file.id,
            name: file.name,
            size: file.size,
            mimeType: file.mime_type,
            canDownload: file.can_download,
            downloadLink: this.directDownloadLink(file.id),
        }));
    }

    async resolve(
        idOrUrl: string
    ): Promise<TPixelDrainFile[]> {
        const trueUrl = await this.unhashLink(idOrUrl);
        const ref = this.parseRef(trueUrl);
        return ref.kind === 'list'
        ? this.getList(ref.id)
        : [await this.getFileInfo(ref.id)];
    }

}
