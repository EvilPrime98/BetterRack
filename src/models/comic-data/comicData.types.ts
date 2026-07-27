export type TComicDataRow = {
    uid: string;
    pref_id: number | null;
    source_wiki: string | null;
    cover: string | null;
    rating: number | null;
    current_page: number | null;
    read_per: number | null;
    read: number | null;
}