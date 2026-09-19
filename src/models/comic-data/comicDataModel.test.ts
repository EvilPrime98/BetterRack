import { afterEach, describe, expect, test } from 'bun:test';
import { ComicDataModel } from './comicDataModel';

const openModels: ComicDataModel[] = [];

function createModel(): ComicDataModel {
    const model = new ComicDataModel(':memory:');
    openModels.push(model);
    return model;
}

afterEach(() => {
    for (const model of openModels.splice(0)) model.close();
});

describe('ComicDataModel.upsert — lastReadAt', () => {

    test('stamps lastReadAt when reading progress changes', () => {
        const model = createModel();
        const before = Date.now();

        const saved = model.upsert('uid-1', { currentPage: 3, readPer: 30 });

        expect(saved.lastReadAt).toBeGreaterThanOrEqual(before);
        expect(model.getByUid('uid-1')?.lastReadAt).toBe(saved.lastReadAt);
    });

    test('keeps lastReadAt when only the rating changes', () => {
        const model = createModel();
        const first = model.upsert('uid-1', { currentPage: 3, readPer: 30 });

        const second = model.upsert('uid-1', { currentPage: 3, readPer: 30, rating: 4 });

        expect(second.lastReadAt).toBe(first.lastReadAt);
    });

    test('ignores a lastReadAt supplied by the caller', () => {
        const model = createModel();
        const first = model.upsert('uid-1', { currentPage: 3, readPer: 30 });

        const second = model.upsert('uid-1', { currentPage: 3, readPer: 30, lastReadAt: 1 });

        expect(second.lastReadAt).toBe(first.lastReadAt);
    });

    test('leaves lastReadAt unset for an entry that never had progress', () => {
        const model = createModel();

        const saved = model.upsert('uid-1', { rating: 5 });

        expect(saved.lastReadAt).toBeUndefined();
    });

});
