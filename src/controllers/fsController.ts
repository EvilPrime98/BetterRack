import type { fsModel } from "#src/types.ts";
import type { Context } from "hono";

export async function fileSystemController(
    c: Context,
    fsModel: fsModel 
) {
    const directories = await fsModel.getListofDirectories();
    return c.json(directories);
}