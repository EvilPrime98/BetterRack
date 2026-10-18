import { shell, type HandlerDetails } from "electron";

export function handleWindowOpen({ url }: HandlerDetails): { action: "deny" } {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
}
