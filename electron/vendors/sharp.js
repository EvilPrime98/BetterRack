/* The compiled server binary cannot load the sharp native addon.
The server runs sharp in a worker instead (see electron/thumbnail-worker.cjs).
The worker loads sharp from this bundled node_modules folder.*/

const WORKER_DIR = "thumbnail-worker";

const bundledModule = (name) => ({
  from: `node_modules/${name}`,
  to: `${WORKER_DIR}/node_modules/${name}`,
});

export const sharpResources = [
  { from: "electron/thumbnail-worker.cjs", to: `${WORKER_DIR}/worker.cjs` },
  ...["sharp", "@img/colour", "detect-libc", "semver"].map(bundledModule),
];

export const sharpWin32Resources = [
  bundledModule("@img/sharp-win32-x64"),
];

export const sharpLinuxResources = [
  bundledModule("@img/sharp-linux-x64"),
  bundledModule("@img/sharp-libvips-linux-x64"),
];
