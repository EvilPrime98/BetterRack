import type { TAppSettings, TLibraryModel, TPreferencesModel } from "#src/types.ts";
import type { Context } from "hono";

export class settingsController {

    private prefsModel: TPreferencesModel;
    private libModel: TLibraryModel;

    constructor(
        prefsModel: TPreferencesModel,
        libModel: TLibraryModel
    ) {
        this.prefsModel = prefsModel;
        this.libModel = libModel;
    }

    public async getSettings(
        c: Context
    ) {
        return c.json(this.prefsModel.getAppSettings(), 200);
    }

    public async updateSettings(
        c: Context
    ) {
        const { outputDirs, ...rest } = await c.req.json() as Partial<TAppSettings>;
        return c.json(this.prefsModel.updateAppSettings(rest), 200);
    }

    public async addLibraryFolder(
        c: Context
    ) {
        const { path } = await c.req.json() as { path?: string };
        if (!path) return c.json({ error: true, message: 'path is required' }, 422);
        try {
            await this.libModel.addLibraryPath(path);
        } catch (e) {
            return c.json({ error: true, message: e instanceof Error ? e.message : 'Failed to add library folder.' }, 400);
        }
        return c.json(this.prefsModel.getAppSettings(), 200);
    }

    public async removeLibraryFolder(
        c: Context
    ) {
        const { path } = await c.req.json() as { path?: string };
        if (!path) return c.json({ error: true, message: 'path is required' }, 422);
        await this.libModel.removeLibraryPath(path);
        return c.json(this.prefsModel.getAppSettings(), 200);
    }

}
