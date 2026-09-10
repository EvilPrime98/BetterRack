import type { TLibraryModel } from "#src/types.ts";
import type { Context } from "hono";
import { logger } from "#utils/logger";
import { MoveError } from "#models/library/library.model";

const log = logger.child({ module: 'libraryController' });

export class libraryController{

    private libModel: TLibraryModel;

    constructor(
        libModel: TLibraryModel
    ) {
        this.libModel = libModel;
    }

    public async getPreferences(
        c: Context
    ) {
        const uid = c.req.param('uid');
        const prefs = this.libModel.getPreferences(uid!);
        if (!prefs) return c.json({ error: true, message: 'No preferences found for this uid.' }, 404);
        return c.json(prefs, 200);
    }

    public async updatePreferences(
        c: Context
    ) {
        try {
            const uid = c.req.param('uid');
            const entry = this.libModel.get(uid);
            if (!entry || Array.isArray(entry)) return c.json({ error: true, message: 'Entry not found for this uid.' }, 404);

            const body = await c.req.json() as Partial<{ prefPublisher: string; recursive: boolean; prefCover: string }>;
            const { prefPublisher, recursive, prefCover } = body;

            await this.libModel.updatePreferences(uid!, {
                ...(prefPublisher !== undefined && { prefPublisher }),
                ...(recursive !== undefined && { recursive }),
                ...(prefCover !== undefined && { prefCover }),
            });

            return c.json({ error: false, message: 'Preferences updated successfully.' }, 200);
        } catch (e) {
            log.error({ err: e }, 'Failed to update preferences');
            return c.json({ error: true, message: 'There was an issue updating preferences. Please, try again later.' }, 500);
        }
    }

    private parsePageOption(raw: string | undefined): number | undefined {
        if (raw === undefined || raw === '') return undefined;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) return undefined;
        return Math.trunc(value);
    }

    public async getIndex(
        c: Context
    ) {
        await this.libModel.ready;
        return c.json(this.libModel.getLibraryIndex(), 200);
    }

    public async get(
        c: Context
    ) {
        await this.libModel.ready;
        const page = this.libModel.getLibraryPage({
            limit: this.parsePageOption(c.req.query('limit')),
            offset: this.parsePageOption(c.req.query('offset')),
        });
        return c.json(page, 200);
    }

    public async getRecent(
        c: Context
    ) {
        await this.libModel.ready;
        // The model applies its default when windowHours is not a positive number.
        const recent = this.libModel.getRecentlyAdded({
            windowHours: this.parsePageOption(c.req.query('windowHours')),
        });
        return c.json(recent, 200);
    }

    public async refresh(
        c: Context
    ){
        try{

            await this.libModel.refresh();

            return c.json(
                {
                    error: false,
                    message: 'Library re-scan completed.',
                    page: this.libModel.getLibraryPage({
                        limit: this.parsePageOption(c.req.query('limit')),
                        offset: this.parsePageOption(c.req.query('offset')),
                    }),
                },
                200
            )

        }catch(e) {

            log.error({ err: e }, 'Failed to re-scan library');

            return c.json(
                { error: true, message: 'There was an issue re-scanning the library. Please, try again later.'},
                500
            )

        }       
        
    }

    public async createFolder(
        c: Context
    ){
        try{

            const { folderName, parentFolderUid } = await c.req.json();

            await this.libModel.createFolder(
                folderName,
                parentFolderUid
            );

            return c.json(
                { error: false, message: 'Folder created succesfully.'},
                200
            )

        }catch(e) {

            log.error({ err: e }, 'Failed to create folder');

            return c.json(
                { error: true, message: 'There was an issue creating the folder. Please, try again later.'},
                500
            )

        }

    }

    public async moveFile(
        c: Context
    ){
        try{

            const { fileUid, targetFolderUid } = await c.req.json();

            await this.libModel.moveFile(fileUid, targetFolderUid);

            return c.json(
                { error: false, message: 'File moved successfully.'},
                200
            )

        }catch(e){

            if (e instanceof MoveError) {
                return c.json({ error: true, message: e.message }, 400);
            }

            log.error({ err: e }, 'Failed to move file');

            return c.json(
                { error: true, message: 'There was an issue moving the file. Please, try again later.'},
                500
            )

        }
    }

    public async deleteFolder(
        c: Context
    ){
        try{

            const { folderUid } = await c.req.json();

            await this.libModel.deleteFolder(folderUid);

            return c.json(
                { error: false, message: 'Folder deleted successfully.'},
                200
            )

        }catch(e){

            log.error({ err: e }, 'Failed to delete folder');

            return c.json(
                { error: true, message: 'There was an issue deleting the folder. Please, try again later.'},
                500
            )

        }
    }

    public async deleteFile(
        c: Context
    ){
        try{

            const { fileUid } = await c.req.json();

            await this.libModel.deleteFile(fileUid);

            return c.json(
                { error: false, message: 'File deleted successfully.'},
                200
            )

        }catch(e){

            log.error({ err: e }, 'Failed to delete file');

            return c.json(
                { error: true, message: 'There was an issue deleting the file. Please, try again later.'},
                500
            )

        }
    }

    public async identify(
        c: Context
    ){
        try{

            const uid = c.req.param('uid');
            if (!uid) return c.json({ error: true, message: 'A valid uid is required.' }, 400);

            const entry = await this.libModel.identify(uid);

            return c.json({ identified: entry.identified, comic: entry.comic }, 200);

        }catch(e){

            log.error({ err: e }, 'Failed to identify comic');

            return c.json(
                { error: true, message: e instanceof Error ? e.message : 'There was an issue identifying the comic. Please, try again later.'},
                500
            )

        }
    }

    public async unidentifyFile(
        c: Context
    ){
        try{

            const { fileUid } = await c.req.json();

            await this.libModel.unidentifyFile(fileUid);

            return c.json(
                { error: false, message: 'File un-identified successfully.'},
                200
            )

        }catch(e){

            log.error({ err: e }, 'Failed to un-identify file');

            return c.json(
                { error: true, message: 'There was an issue un-identifying the file. Please, try again later.'},
                500
            )

        }
    }

    public async commitIdentify(
        c: Context
    ){
        try{

            const { fileUid, comic } = await c.req.json();

            if (!fileUid || !comic) return c.json({ error: true, message: 'A file uid and comic are required.' }, 400);

            await this.libModel.commitIdentify(fileUid, comic);

            return c.json(
                { error: false, message: 'File identified successfully.'},
                200
            )

        }catch(e){

            log.error({ err: e }, 'Failed to identify file');

            return c.json(
                { error: true, message: 'There was an issue identifying the file. Please, try again later.'},
                500
            )

        }
    }

}