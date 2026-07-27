import type { TComicData, TComicDataModel } from "#src/types.ts";
import type { Context } from "hono";

export class comicDataController {

    private comicDataModel: TComicDataModel;

    constructor(
        comicDataModel: TComicDataModel
    ) {
        this.comicDataModel = comicDataModel;
    }

    public async getAll(
        c: Context
    ) {
        return c.json(this.comicDataModel.getAll(), 200);
    }

    public async update(
        c: Context
    ) {
        const uid = c.req.param('uid');
        if (!uid) return c.json({ error: true, message: 'A valid uid is required.' }, 400);

        const partial = await c.req.json() as Partial<Omit<TComicData, 'uid'>>;
        const updated = this.comicDataModel.upsert(uid, partial);

        return c.json(updated, 200);
    }

}
