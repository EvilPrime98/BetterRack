import type { WikiComic, WikiFlags } from "better-wiki";
import { wikiDarkHorseClient, wikiDcClient, wikiDynamiteClient, wikiImageClient, wikiMarvelClient } from "../context/wiki.context";

export async function fetchComic(
    title: string
): Promise<WikiComic | null> {

    const flags = {
        thumbnailSize: 450,
        includeCollections: true
    }
    
    const results = await Promise.all([       
        wikiDcClient.getComic(title,flags),      
        wikiMarvelClient.getComic(title,flags),     
        wikiImageClient.getComic(title,flags),      
        wikiDarkHorseClient.getComic(title,flags),   
        wikiDynamiteClient.getComic(title,flags)
    ]);

    for (const result of results){
        if (result) return result;
    }

    return null
    
}

export async function fetchComicById(
    pageId: number
): Promise<WikiComic | null> {

    const flags = {
        thumbnailSize: 450
    }
    
    const results = await Promise.all([      
        wikiDcClient.getComicById(pageId,flags),     
        wikiMarvelClient.getComicById(pageId,flags),      
        wikiImageClient.getComicById(pageId,flags),    
        wikiDarkHorseClient.getComicById(pageId,flags),    
        wikiDynamiteClient.getComicById(pageId,flags)
    ]);

    for (const result of results) if (result) return result;
    return null;
    
}

export async function fetchComics(
    title: string
): Promise<WikiComic[]> {

    const flags = {
        multiple: true,
        thumbnailSize: 450,
        includeCollections: true
    } as Pick<WikiFlags, "thumbnailSize" | "includeCollections" | "category" | "sorted"> & { multiple: true };
    
    const results = await Promise.all([
        wikiDcClient.getComic(title,flags),
        wikiMarvelClient.getComic(title,flags),
        wikiImageClient.getComic(title,flags),
        wikiDarkHorseClient.getComic(title, flags),       
        wikiDynamiteClient.getComic(title, flags)
    ]);

    return results.flat()
    
}