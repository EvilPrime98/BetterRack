export interface IAppSettings {
    outputDirs: string[];
    apiUrl: string;
    downloadDir: string;
    identifyFromMeta: boolean;
}

export type TFieldKey = 'apiUrl'
| 'downloadDir';