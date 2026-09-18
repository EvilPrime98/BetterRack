import fs from "node:fs";
import path from "node:path";

export function createStartupLogger(userDataPath: string) {

    const logDir = path.join(userDataPath, "logs");
    fs.mkdirSync(logDir, { recursive: true });

    const filePath = path.join(logDir, "startup.log");
    const stream = fs.createWriteStream(filePath, { flags: "a" });

    stream.write(`\n----- startup ${new Date().toISOString()} -----\n`);

    const log = (line: string): void => {
        const entry = `[${new Date().toISOString()}] ${line}`;
        console.log(entry);
        stream.write(entry + "\n");
    };

    return { log, filePath };

}
