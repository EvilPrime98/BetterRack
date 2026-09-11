import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { LibraryModel, MoveError } from './library.model';

// Mirrors LibraryModel.uidFromPath so a test can address a scanned entry by
// its on-disk path without reaching into the model's private maps.
const uidFromPath = (absPath: string) => {
    const hash = crypto.createHash('sha256').update(path.resolve(absPath)).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
};

let root: string;

const makeModel = () => {
    const prefsModel = {
        getAppSettings: () => ({ outputDirs: [root] }),
        getAllLibraryPrefs: () => [],
    };
    const comicDataModel = { getAll: () => ({}) };
    const wikiModel = {};
    const zipModel = {};
    return new LibraryModel(
        prefsModel as unknown as ConstructorParameters<typeof LibraryModel>[0],
        wikiModel as unknown as ConstructorParameters<typeof LibraryModel>[1],
        comicDataModel as unknown as ConstructorParameters<typeof LibraryModel>[2],
        zipModel as unknown as ConstructorParameters<typeof LibraryModel>[3],
    );
};

beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'library-move-test-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('LibraryModel.moveFile — folder guards', () => {

    test('rejects moving a folder into one of its own descendants', async () => {
        await mkdir(path.join(root, 'parent', 'child'), { recursive: true });
        const model = makeModel();
        await model.ready;

        await expect(
            model.moveFile(uidFromPath(path.join(root, 'parent')), uidFromPath(path.join(root, 'parent', 'child'))),
        ).rejects.toBeInstanceOf(MoveError);
        expect(existsSync(path.join(root, 'parent'))).toBe(true);
    });

    test('rejects a no-op move into the folder\'s current parent', async () => {
        await mkdir(path.join(root, 'p', 'movable'), { recursive: true });
        const model = makeModel();
        await model.ready;

        await expect(
            model.moveFile(uidFromPath(path.join(root, 'p', 'movable')), uidFromPath(path.join(root, 'p'))),
        ).rejects.toBeInstanceOf(MoveError);
    });

    test('rejects moving a folder onto a colliding name at the destination', async () => {
        await mkdir(path.join(root, 'a', 'shared'), { recursive: true });
        await mkdir(path.join(root, 'b', 'shared'), { recursive: true });
        const model = makeModel();
        await model.ready;

        await expect(
            model.moveFile(uidFromPath(path.join(root, 'a', 'shared')), uidFromPath(path.join(root, 'b'))),
        ).rejects.toBeInstanceOf(MoveError);
    });

    test('moves a folder into a valid sibling directory', async () => {
        await mkdir(path.join(root, 'src', 'movable'), { recursive: true });
        await mkdir(path.join(root, 'dst'), { recursive: true });
        const model = makeModel();
        await model.ready;

        await model.moveFile(uidFromPath(path.join(root, 'src', 'movable')), uidFromPath(path.join(root, 'dst')));

        expect(existsSync(path.join(root, 'dst', 'movable'))).toBe(true);
        expect(existsSync(path.join(root, 'src', 'movable'))).toBe(false);
    });

});
