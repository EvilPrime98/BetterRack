export interface IAppSettings {
    outputDirs: string[];
    apiUrl: string;
    baseUrl: string;
    hostDomain: string;
    downloadDir: string;
    identifyFromMeta: boolean;
}

export type TFieldKey = 'apiUrl'
| 'baseUrl'
| 'hostDomain'
| 'downloadDir';