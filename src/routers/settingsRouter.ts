import { Hono } from "hono";
import type { TLibraryModel, TPreferencesModel } from "#src/types.ts";
import { settingsController } from "#src/controllers/settingsController.ts";

export function settingsRouter(
    prefsModel: TPreferencesModel,
    libModel: TLibraryModel
) {
    const app = new Hono();
    const sc = new settingsController(prefsModel, libModel);
    app.get('/', (c) => sc.getSettings(c));
    app.put('/', (c) => sc.updateSettings(c));
    app.post('/library-folder', (c) => sc.addLibraryFolder(c));
    app.delete('/library-folder', (c) => sc.removeLibraryFolder(c));
    return app;
}
