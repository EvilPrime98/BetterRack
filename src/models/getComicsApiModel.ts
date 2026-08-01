//import pLimit from 'p-limit';
import type { TCacheModel, TDownloadableObject, TDownloadLink, TGetComicsApiModel, TPostLink, TPreferencesModel, TStrat, WPPost } from '#src/types';
import he from 'he';
import crypto from 'node:crypto';
import { GcwHtmlParser } from './gcwHtmlParserModel';

export class GetComicsApiModel implements TGetComicsApiModel {

    private cache: TCacheModel;
    private prefsModel: TPreferencesModel;

    constructor(cache: TCacheModel, prefsModel: TPreferencesModel) {
        this.cache = cache;
        this.prefsModel = prefsModel;
    }

    private get apiUrl(): string {
        return this.prefsModel.getAppSettings().apiUrl;
    }

    private buildHeaders = (): HeadersInit => {
        const { baseUrl } = this.prefsModel.getAppSettings();
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': baseUrl + '/',
            'Origin': baseUrl,
            'DNT': '1',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
        };
    }

    private randomDelay = (min = 1200, max = 3000): Promise<void> => {
        return new Promise(res => setTimeout(res, min + Math.random() * (max - min)));
    }

    private fetchWithRetry = async (
        url: string,
        options?: RequestInit,
        maxRetries = 4,
    ): Promise<Response> => {
        let lastRes: Response | undefined;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                const backoff = Math.min(2 ** attempt * 2000, 30000) + Math.random() * 1000;
                await new Promise(res => setTimeout(res, backoff));
            }
            const res = await fetch(url, { method: 'GET', ...options, headers: { ...this.buildHeaders(), ...options?.headers } });
            if (res.status !== 429) return res;
            const retryAfter = res.headers.get('Retry-After');
            if (retryAfter) {
                const wait = (parseInt(retryAfter, 10) || 10) * 1000 + Math.random() * 500;
                await new Promise(r => setTimeout(r, wait));
            }
            lastRes = res;
        }
        return lastRes!;
    };

    // private parseDownloadLink = (html: string): string | null => {
    //     const primaryMatch =
    //         html.match(/<a[^>]+href="([^"]+)"[^>]*title="DOWNLOAD NOW"[^>]*>/i) ??
    //         html.match(/<a[^>]+title="DOWNLOAD NOW"[^>]*href="([^"]+)"[^>]*>/i);
    //     if (primaryMatch?.[1]) return primaryMatch[1];
    //     const fallbackMatch = html.match(/href="(https?:\/\/getcomics\.org\/dlds\/[^"]+)"/i);
    //     return fallbackMatch?.[1] ?? null;
    // };

    private normalizeTitle = (title: string): string => {
        return he.decode(he.decode(title)).trim();
    }

    private mapPosts = (posts: WPPost[]): TPostLink[] => {
        return posts.map(post => ({
            id: post.id,
            title: this.normalizeTitle(post.title.rendered),
            link: post.link,
            thumbnailUrl: post.jetpack_featured_media_url,
            uploadDate: post.date,
        }));
    }

    private buildPostSearchParams = (params: {
        search: string;
        perPage?: number;
    }): URLSearchParams =>{
        return new URLSearchParams({
            search: params.search,
            _fields: 'id,title,link,jetpack_featured_media_url,date',
            ...(params.perPage ? { per_page: params.perPage.toString() } : {}),
        });
    }

    private parseWeeklyListPostLinks = (html: string, group?: string): { title: string; link: string }[] => {
        let searchHtml = html;
        if (group) {
            const sectionRegex = /<h3><span[^>]*>([^<]+)<\/span><\/h3>([\s\S]*?)(?=<h3>|$)/gi;
            let sectionMatch;
            let sectionHtml: string | null = null;
            while ((sectionMatch = sectionRegex.exec(html)) !== null) {
                if (sectionMatch[1].trim().toLowerCase().includes(group.toLowerCase())) {
                    sectionHtml = sectionMatch[2];
                    break;
                }
            }
            if (!sectionHtml) return [];
            searchHtml = sectionHtml;
        }
        const regex = /<li><strong>(.*?)\s*:\s*<span[^>]*>\s*<a[^>]+href="(https:\/\/getcomics\.org\/[^"]+)"[^>]*>Download<\/a>/gi;
        const results: { title: string; link: string }[] = [];
        let match;
        while ((match = regex.exec(searchHtml)) !== null) {
            results.push({ title: this.normalizeTitle(match[1]), link: match[2] });
        }
        return results;
    };

    private htmlParseDownloadLinks = async (
        rawHtml: string,
        strat: TStrat = 'all'
    ): Promise<TDownloadLink[]> => {
        const { hostDomain } = this.prefsModel.getAppSettings();
        const parser = new GcwHtmlParser(rawHtml, hostDomain);
        return parser.strategize(strat);
    }

    // private getRawHTML = async (postId: number) =>{
    //     const cacheKey = `download_link_${postId}`;
    //     const cached = this.cache.get(cacheKey);
    //     if (cached !== undefined) return cached;
    //     const res = await this.fetchWithRetry(`${API_URL}/posts/${postId}?_fields=content,jetpack_featured_media_url`);
    //     if (!res.ok) return null;
    //     const post: Pick<WPPost, 'content' | 'jetpack_featured_media_url'> = await res.json();
    //     if (post.jetpack_featured_media_url) {
    //         this.cache.set(`cover_${postId}`, post.jetpack_featured_media_url, 60 * 60 * 1000);
    //     }
    //     return post.content.rendered;
    // }

    // getDownloadLinksFromPosts = async (
    //     postLinks: TPostLink[],
    //     limit = 2,
    // ): Promise<TDownloadLink[]> => {
    //     const limiter = pLimit(limit);
    //     return Promise.all(
    //         postLinks.map(postLink =>
    //             limiter(async () => {
    //                 await this.randomDelay(800, 2000);
    //                 try {
    //                     const downloadLink = postLink.id
    //                         ? await this.getDownloadLinkFromPost(postLink.id)
    //                         : null;
    //                     return { title: postLink.title, downloadLink } satisfies TDownloadLink;
    //                 } catch {
    //                     return { title: postLink.title, downloadLink: null } satisfies TDownloadLink;
    //                 }
    //             })
    //         )
    //     );
    // };

    //public

    getWeeklyListPosts = async (group?: string): Promise<TPostLink[]> => {
        const listRes = await this.fetchWithRetry(`${this.apiUrl}/posts?search=weekly-pack&per_page=1&_fields=id,content`);
        if (!listRes.ok) return [];
        const [listPost]: Pick<WPPost, 'id' | 'content'>[] = await listRes.json();
        if (!listPost) return [];
        const parsed = this.parseWeeklyListPostLinks(listPost.content.rendered, group);
        if (!parsed.length) return [];
        const slugs = parsed.map(({ link }) => new URL(link).pathname.split('/').filter(Boolean).pop()!);
        await this.randomDelay();
        const postsRes = await this.fetchWithRetry(`${this.apiUrl}/posts?slug=${slugs.join(',')}&_fields=id,title,link,jetpack_featured_media_url,date&per_page=100`);
        if (!postsRes.ok) return parsed;
        const posts: WPPost[] = await postsRes.json();
        const postBySlug = new Map(
            posts.map(p => [new URL(p.link).pathname.split('/').filter(Boolean).pop()!, p])
        );
        return parsed.map(({ title, link }) => {
            const slug = new URL(link).pathname.split('/').filter(Boolean).pop()!;
            const post = postBySlug.get(slug);
            return { id: post?.id, title, link, thumbnailUrl: post?.jetpack_featured_media_url, uploadDate: post?.date };
        });
    };

    getDownloadLinks = async (
        postId: number,
        strat: TStrat
    ): Promise<TDownloadableObject[]> => {
        
        const cacheKey = `download_link_${postId}_${strat}`;
        const cached = this.cache.get<TDownloadableObject>(cacheKey);
        if (cached.length > 0) return cached;

        const res = await this.fetchWithRetry(`${this.apiUrl}/posts/${postId}?_fields=content,jetpack_featured_media_url`);
        if (!res.ok) return [];
        
        const post: Pick<WPPost, 'content' | 'jetpack_featured_media_url'> = await res.json();
        if (post.jetpack_featured_media_url) {
            this.cache.set(`cover_${postId}`, post.jetpack_featured_media_url, 60 * 60 * 1000);
        }

        const downloadLinks = await this.htmlParseDownloadLinks(post.content.rendered, strat);
        
        if (downloadLinks.length > 0) {

            const hashedLinks = downloadLinks.map(dl => {
                return {
                    uuid: crypto.randomUUID(),
                    title: dl.title,
                    downloadLink: dl.downloadLink
                }
            })
        
            this.cache.set(cacheKey, hashedLinks, 60 * 60 * 1000);
        
            return hashedLinks.map(hlink => {
                return {
                    uuid: hlink.uuid,
                    title: hlink.title
                }
            });

        }

        return [];

    };

    getCoverFromPost = async (
        postId: number
    ): Promise<string | null> => {
        const cacheKey = `cover_${postId}`;
        const cached = this.cache.get<string>(cacheKey);
        if (cached.length > 0) return cached[0];
        const res = await this.fetchWithRetry(`${this.apiUrl}/posts/${postId}?_fields=jetpack_featured_media_url`);
        if (!res.ok) return null;
        const post: Pick<WPPost, 'jetpack_featured_media_url'> = await res.json();
        const cover = post.jetpack_featured_media_url || null;
        this.cache.set(cacheKey, cover ?? '', 60 * 60 * 1000);
        return cover;
    };

    getPostLinks = async (params: {
        search: string;
        page?: number | number[];
        perPage?: number;
    }): Promise<TPostLink[]> => {
        if (Array.isArray(params.page)) {
            return this.getPostLinksForPages({ search: params.search, pages: params.page, perPage: params.perPage });
        }
        const searchParams = this.buildPostSearchParams(params);
        searchParams.set('page', (params.page ?? 1).toString());
        const res = await this.fetchWithRetry(`${this.apiUrl}/posts?${searchParams}`);
        if (!res.ok) return [];
        const posts: WPPost[] = await res.json();
        return this.mapPosts(posts);
    };

    getPostLinksForPages = async (params: {
        search: string;
        pages: number[];
        perPage?: number;
    }): Promise<TPostLink[]> => {
        const searchParams = this.buildPostSearchParams(params);
        const results: TPostLink[] = [];
        for (const page of params.pages) {
            await this.randomDelay();
            const res = await this.fetchWithRetry(`${this.apiUrl}/posts?${searchParams}&page=${page}`);
            if (!res.ok) continue;
            const posts: WPPost[] = await res.json();
            results.push(...this.mapPosts(posts));
        }
        return results;
    };

    getLatest = async (params?: {
        page?: number;
        perPage?: number;
    }): Promise<TPostLink[]> => {
        const page = params?.page ?? 1;
        const perPage = params?.perPage ?? 10;
        const cacheKey = `latest_${page}_${perPage}`;
        const cached = this.cache.get<TPostLink>(cacheKey);
        if (cached.length > 0) return cached;
        const searchParams = new URLSearchParams({
            orderby: 'date',
            order: 'desc',
            per_page: perPage.toString(),
            page: page.toString(),
            _fields: 'id,title,link,jetpack_featured_media_url,date',
        });
        const res = await this.fetchWithRetry(`${this.apiUrl}/posts?${searchParams}`);
        if (!res.ok) return [];
        const posts: WPPost[] = await res.json();
        const result = this.mapPosts(posts);
        if (result.length > 0) this.cache.set(cacheKey, result, 5 * 60 * 1000);
        return result;
    };

    getDownloadLinkFromPost = async (
        postId: number,
        strat: TStrat,
        uuid?: string
    ): Promise<string | null> => {
        
        const cacheKey = `download_link_${postId}_${strat}`;
        const cached = this.cache.get<TDownloadLink & TDownloadableObject>(cacheKey);

        if (cached.length > 0) {
            const cachedItem = cached.find(el => el.uuid === uuid);
            if (cachedItem) return cachedItem.downloadLink;
        };
        
        const res = await this.fetchWithRetry(`${this.apiUrl}/posts/${postId}?_fields=content`);
        if (!res.ok) return null;

        const post: Pick<WPPost, 'content'> = await res.json();
        
        const dLink = (await this.htmlParseDownloadLinks(post.content.rendered))[0];
        if (dLink) this.cache.set(cacheKey, dLink.downloadLink, 60 * 60 * 1000);

        return dLink.downloadLink;

    };

}