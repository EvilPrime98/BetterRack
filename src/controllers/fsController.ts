import type { fsModel, TPreferencesModel } from "#src/types.ts";
import type { Context } from "hono";

export async function fileSystemController(
    c: Context,
    fsModel: fsModel,
    prefsModel: TPreferencesModel
) {
    const { outputDirs, downloadDir } = prefsModel.getAppSettings();
    const roots = [
        ...(downloadDir ? [downloadDir] : []),
        ...outputDirs
    ];
    const directories = await fsModel.getDirectoriesUnder(roots);
    return c.json({ directories });
}
