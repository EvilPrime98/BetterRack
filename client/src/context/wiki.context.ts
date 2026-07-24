import { wiki } from "better-wiki";

export const wikiDcClient = wiki({ 
    plugin: 'dc-fandom' 
});

export const wikiMarvelClient = wiki({ 
    plugin: 'dc-fandom', 
    url: 'https://marvel.fandom.com'
});

export const wikiImageClient = wiki({ 
    plugin: 'dc-fandom', 
    url: 'https://imagecomics.fandom.com'
});

export const wikiDarkHorseClient = wiki({ 
    plugin: 'dc-fandom', 
    url: 'https://darkhorse.fandom.com'
});

export const wikiDynamiteClient = wiki({ 
    plugin: 'dc-fandom', 
    url: 'https://dynamiteentertainment.fandom.com'
});