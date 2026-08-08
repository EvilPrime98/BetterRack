import { existsSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';

/**
 * `bun build --compile` cannot embed sharp's native .node binary, so sharp is
 * built as an external dependency and its runtime deps are copied next to the
 * compiled server binary instead, where Bun's module resolution can find them.
 *
 * The copy is nested under `vendor/node_modules` rather than directly under
 * `dist/server/node_modules`: electron-builder's extraResources copier silently
 * drops any folder named exactly "node_modules" that sits as a direct child of
 * the copied source root (app-builder-lib/out/util/filter.js), but leaves a
 * nested one alone. NODE_PATH in main.ts points at this nested folder.
 */

const projectRoot = path.resolve(import.meta.dir, '..');
const destNodeModules = path.join(projectRoot, 'dist', 'server', 'vendor', 'node_modules');

const packages = ['sharp', '@img', 'detect-libc', 'semver'];

rmSync(destNodeModules, { recursive: true, force: true });
mkdirSync(destNodeModules, { recursive: true });

for (const pkg of packages) {
    const src = path.join(projectRoot, 'node_modules', pkg);
    if (!existsSync(src)) {
        throw new Error(`Missing runtime dependency for sharp: ${pkg} (expected at ${src})`);
    }
    cpSync(src, path.join(destNodeModules, pkg), { recursive: true });
}
