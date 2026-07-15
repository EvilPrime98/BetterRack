import { readdir } from "node:fs/promises";
import path from "node:path";

export class FileSystemModel {

    rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = path.resolve(rootPath);
    }

    async getListofDirectories(): Promise<string[]> {
        const recurse = async (rel: string): Promise<string[]> => {
            const entries = (await readdir(path.join(this.rootPath, rel), { withFileTypes: true }))
                .filter(entry => entry.isDirectory())
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            const results: string[] = [];
            for (const entry of entries) {
                const childRel = rel ? `${rel}/${entry.name}` : entry.name;
                results.push(childRel);
                results.push(...await recurse(childRel));
            }
            return results;
        };
        return ['', ...await recurse('')];
    }

    async getFullPath(dir: string): Promise<string> {
        return path.resolve(this.rootPath, dir);
    }

}