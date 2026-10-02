export interface IAppSettings {
    outputDirs: string[];
    apiUrl: string;
    downloadDir: string;
    wikiSearch: boolean;
    rescanOnStartup: boolean;
}

export type TFieldKey = 'apiUrl'
| 'downloadDir';