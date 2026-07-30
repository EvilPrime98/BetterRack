export interface IAppSettings {
    outputDirs: string[];
    apiUrl: string;
    baseUrl: string;
    hostDomain: string;
    downloadDir: string;
}

export type TFieldKey = 'apiUrl'
| 'baseUrl'
| 'hostDomain'
| 'downloadDir';