import { parseHTML } from "linkedom";
import type { TDownloadLink, TStrat } from "#src/types.ts";
import { VALID_STRATS } from "#src/types.ts";

const FORBIDDEN_PROVIDERS = ['terabox', 'mega', 'pixeldrain', 'wetransfer'];

export class GcwHtmlParser {

    private document;
    private Node;
    private issuesCache: TDownloadLink[] = [];
    private forbiddenUrls: string[];

    constructor(rawHtml: string, hostDomain: string){
        const result = parseHTML(rawHtml);
        this.document = result.document;
        this.Node = result.Node;
        this.forbiddenUrls = hostDomain ? [
            `${hostDomain}/dc`,
            `${hostDomain}/marvel`,
            `${hostDomain}/other-comics`,
        ] : [];
    }

    private normalizeText(
        text: string
    ): string{
        return text
        .replace(/[\n:]/g, '')
        .replace(/\s+/g,' ')
        .trim();
    }

    private normalizeLinks(
        links: TDownloadLink[]
    ): TDownloadLink[]{
        const filteredlinks = links
        .filter(link => {
            return FORBIDDEN_PROVIDERS.every(prov => !link.downloadLink?.toLocaleLowerCase()?.includes(prov))
            && this.forbiddenUrls.every(url => !link.downloadLink?.toLocaleLowerCase()?.includes(url) )
            && link.downloadLink !== undefined && link.title !== undefined
        })
        return filteredlinks
        .filter(Boolean);
    }

    private getIssues(): TDownloadLink[]{
        return this.issuesCache
        .filter(Boolean)
    }

    //single issue strategies
    private stratSingleIssue_1(): this {
        if (this.issuesCache.length > 0) return this;
        const $free = Array.from(this.document.querySelectorAll('h2'))
        .filter(el => {
            const content = el.innerHTML.toLocaleLowerCase();
            return content.includes('free') &&
            content.includes('comics')
        })[0];
        const $p = $free.nextElementSibling;
        const $title = $p?.querySelector('strong');
        const $div = $p?.nextElementSibling?.nextElementSibling;
        const $a = $div?.querySelector('a');
        const link = {
            title: $title?.textContent || '',
            downloadLink: $a?.href || ''
        }
        const [normalized] = this.normalizeLinks([link]);
        if (normalized) this.issuesCache.push(normalized);
        return this;
    }

    private stratSingleIssue_2(): this {
        if (this.issuesCache.length > 0) return this;
        let anchor: HTMLAnchorElement | undefined;
        for (const $a of this.document.querySelectorAll<HTMLAnchorElement>('a')) {          
            if (
                $a.title.toLowerCase().includes('download now') &&
                $a.textContent?.toLowerCase().includes('download now')
            ) {
                anchor = $a;
                break;
            }
        }
        if (!anchor) return this;
        const title = anchor.parentElement
        ?.parentElement
        ?.previousElementSibling
        ?.previousElementSibling
        ?.querySelector('strong')
        ?.textContent;
        const [normalized] = this.normalizeLinks([
            {
                title: title || '',
                downloadLink: anchor.href,
            }
        ]);
        if (normalized) this.issuesCache.push(normalized);
        return this;
    }

    private stratSingleIssue_3(): this {
        
        if (this.issuesCache.length > 0) return this;

        const $a = this.document.querySelector<HTMLAnchorElement>(
            'a.aio-red[title="Download Now" i]'
        ); if (!$a) return this;

        const $heading = Array.from(this.document.querySelectorAll('h2'))
        .find(el => {
            const text = el.textContent?.toLocaleLowerCase() ?? '';
            return text.includes('download') &&
            (text.includes('comic') || text.includes('free'));
        });
        
        const title = $heading?.nextElementSibling?.querySelector('strong')?.textContent
        || this.document.querySelector('p strong')?.textContent
        || '';

        const [normalized] = this.normalizeLinks([
            {
                title: this.normalizeText(title),
                downloadLink: $a.href,
            }
        ]);

        if (normalized) this.issuesCache.push(normalized);
        return this;
        
    }

    //multiple issue strategies
    private stratMultiple_1(): this{
        if (this.issuesCache.length > 0) return this;
        const $list = this.document.querySelector('ul');
        if (!$list) return this;
        const $li = Array.from($list.querySelectorAll('li'));
        const returnable = [];
        for (const $el of $li){
            const directText = [...$el.childNodes]
            .filter(node => node.nodeType === this.Node.TEXT_NODE)
            .map(node => node.textContent)
            .join('');
            if (directText.toLocaleLowerCase().includes('difficulties to download')) return this;
            const $link = $el.querySelector('a');            
            returnable.push({
                title: this.normalizeText(directText),
                downloadLink: $link?.href || ''
            });
        }
        this.issuesCache = this.issuesCache.concat(this.normalizeLinks(returnable));
        return this;
    }

    //proxies
    private singleStrats(): this{
        return this
        .stratSingleIssue_3()
        .stratSingleIssue_1()
        .stratSingleIssue_2()
    }

    private multipleStrats(): this{
        return this
        .stratMultiple_1()
    }

    strategize(
        strat: TStrat
    ): TDownloadLink[]{
        this.issuesCache = [];
        if (strat === VALID_STRATS.multiple) return this.multipleStrats().getIssues();
        if (strat === VALID_STRATS.single) return this.singleStrats().getIssues();
        return this
        .multipleStrats()
        .singleStrats()
        .getIssues()
    }
    
}