export type TAppSettingRow = {
    key: string;
    value: string | null;
}

export type TLibraryPrefRow = {
    uid: string;
    pref_publisher: string | null;
    recursive: number | null;
    pref_cover: string | null;
}
