import { wiki } from "better-wiki";

export const wikiDcClient = wiki({ plugin: 'dc-fandom' });

export const wikiMarvelClient = wiki({ plugin: 'dc-fandom', url: 'https://marvel.fandom.com'});

export const wikiImageClient = wiki({ plugin: 'dc-fandom', url: 'https://imagecomics.fandom.com/'});