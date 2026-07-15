import type { TGetComicsApiModel, TStrat } from "#src/types.ts";
import type { Context } from "hono";

export class ComicsController {

    private gcwModel: TGetComicsApiModel;

    constructor(gcwModel: TGetComicsApiModel) {
        this.gcwModel = gcwModel;
    }

    public async getComics(
        c: Context
    ) {

        const latest = c.req.query('latest') === 'true';

        if (latest) {
            const page = Number(c.req.query('page')) || 1;
            const perPage = Number(c.req.query('perPage')) || 10;
            const latestPosts = await this.gcwModel.getLatest({ page, perPage });
            return c.json(latestPosts, 200);
        }

        const weekly = c.req.query('weekly') === 'true';

        if (weekly) {
            const group = c.req.query('group') || undefined;
            const weeklyPosts = await this.gcwModel.getWeeklyListPosts(group);
            return c.json(
                weeklyPosts,
                200
            );
        }

        const search = c.req.query('search');

        if (!search) {
            return c.json(
                [],
                422
            );
        }

        const numOfPages = Number(c.req.query('pages')) || 1;
        const exact = c.req.query('exact') === 'true';
        const pages = Array.from({ length: numOfPages }, (_, i) => i + 1);
        
        const postLinks = await this.gcwModel.getPostLinks({ 
            search, 
            page: [...pages] 
        });

        if (exact === true) {
            return c.json(
                postLinks.filter(p => p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
                200
            );
        }

        return c.json(
            postLinks,
            200
        );

    }

    public async getLinks(
        c: Context
    ){

        const id = c.req.param('id');      
        if (!id) {
            return c.json(
                { error: true, message: 'Missing id', links: [] },
                422
            );
        };

        const strat = c.req.query('strat') || 'all';

        const links = await this.gcwModel.getDownloadLinks(
            parseInt(id),
            strat as TStrat
        );

        if (links && links.length > 0) {
            
            return c.json(
                { error: false, message: 'OK', strat, links },
                200
            );

        }else{

            return c.json(
                { error: true, message: 'No links found', strat, links: [] },
                404
            );

        }
        
    }

}