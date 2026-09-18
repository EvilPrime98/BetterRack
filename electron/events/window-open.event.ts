import { shell } from "electron";

export function handleWindowOpen({ url }: { url: string }): { action: "deny" } {
    shell.openExternal(url);
    return { action: "deny" };
}
