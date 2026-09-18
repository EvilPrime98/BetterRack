import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * `bun build --compile` cannot embed sharp's native .node binary, so sharp is
 * built as an external dependency and its runtime deps are copied next to the
 * compiled server binary instead, where Bun's module resolution can find them.
 * The copy is nested under `vendor/node_modules` rather than directly under
 * `dist/server/node_modules`
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

/**
 * A compiled Bun binary resolves a bare `require("pkg")` for an external
 * package by looking for `index.{js,cjs}` at that package's root and ignores
 * its package.json `main`/`exports` field entirely. sharp and detect-libc
 * point `main` at a file in a subdirectory, so a bare require of either one
 * fails at runtime ("Cannot find package") once the compiled server runs
 * outside the source tree. Add a root-level shim that forwards to the real
 * entry point for each affected package.
 */
const shims: Record<string, string> = {
    sharp: './dist/index.cjs',
    'detect-libc': './lib/detect-libc.js',
};

for (const [pkg, entry] of Object.entries(shims)) {
    writeFileSync(
        path.join(destNodeModules, pkg, 'index.js'),
        `module.exports = require('${entry}');\n`,
    );
}

/**
 * sharp.cjs loads the native addon with `require("@img/sharp-<platform>/sharp.node")`.
 * That subpath only exists via the platform package's `exports` map (it points
 * at `./index.cjs`, which in turn does a relative require of the real,
 * version-suffixed `.node` file under `lib/`). The same "external resolution
 * ignores package.json" limitation above applies to subpath exports too, so
 * the literal `sharp.node` file needs to actually exist at the package root.
 */
const imgDir = path.join(destNodeModules, '@img');
if (existsSync(imgDir)) {
    for (const entry of readdirSync(imgDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith('sharp-')) continue;
        const pkgDir = path.join(imgDir, entry.name);
        const libDir = path.join(pkgDir, 'lib');
        if (!existsSync(libDir)) continue;
        const libFiles = readdirSync(libDir);
        const nativeBinary = libFiles.find((f) => f.endsWith('.node'));
        if (!nativeBinary) continue;
        // The .node file's DLL dependencies (e.g. libvips) are resolved by
        // Windows relative to its own directory, so they must sit next to it.
        for (const file of libFiles) {
            cpSync(path.join(libDir, file), path.join(pkgDir, file === nativeBinary ? 'sharp.node' : file));
        }
    }
}
