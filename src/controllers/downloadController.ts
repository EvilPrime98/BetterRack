import type { TDownloadModel, TGetComicsApiModel, TLibraryModel, TStrat } from "#src/types.ts";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { fsModel } from "#src/types.ts";

export class DownloadController {

    private dwnModel: TDownloadModel;
    private gcwModel: TGetComicsApiModel;
    private fsModel: fsModel;
    private libModel: TLibraryModel;

    constructor(
        dwnModel: TDownloadModel,
        gcwModel: TGetComicsApiModel,
        fsModel: fsModel,
        libModel: TLibraryModel
    ) {
        this.dwnModel = dwnModel;
        this.gcwModel = gcwModel;
        this.fsModel = fsModel;
        this.libModel = libModel;
    }

    public async downloadComic(
        c: Context
    ) {

        try {

            const { id, title, outputDir, uuid, csd, strat } = c.req.query();

            if (!id || !title || !uuid) {
                return c.json({
                    error: true,
                    message: 'Missing id, title, or uuid'
                }, 422);
            }

            const downloadLink = await this.gcwModel.getDownloadLinkFromPost(
                parseInt(id),
                strat as TStrat,
                uuid
            );

            if (!downloadLink) {
                return c.json({
                    error: true,
                    message: 'This comic cannot be downloaded'
                }, 400);
            }

            if (csd === 'true') {

                return c.json({
                    error: false,
                    message: 'OK',
                    downloadLink
                }, 200);

            } else {

                const outputDirPath = await this.fsModel.getFullPath(outputDir || '/');
                const dwnModel = this.dwnModel;
                const libModel = this.libModel;

                return streamSSE(c, async (stream) => {
                    const emit = (event: object) =>
                        stream.writeSSE({ data: JSON.stringify(event) });

                    await dwnModel.downloadComic({
                        link: { title, downloadLink },
                        outputDir: outputDirPath,
                        onProgress: (event) => { emit(event); }
                    });

                    libModel.scan();
                });

            }

        } catch (e) {

            console.log(e);

            return c.json({
                error: true,
                message: 'Failed to download comic'
            }, 500);

        }


    }

}
