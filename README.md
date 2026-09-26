# Better Rack

[![CI](https://github.com/EvilPrime98/BetterRack/actions/workflows/ci.yml/badge.svg)](https://github.com/EvilPrime98/BetterRack/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)

Better Rack is a desktop app for organizing and reading a local comic book library (CBR/CBZ). It also includes a store to search and download comics from a configurable source, and metadata lookups through an integrated wiki.

<img width="1916" height="917" alt="Better Rack library view" src="https://github.com/user-attachments/assets/21d98172-f3ba-468e-b404-33bf962fcffa" />

## Why Better Rack

Comic collections tend to end up spread across folders, with a different tool for each job: one to read, one to find new issues, one to look up what a series is about. Better Rack puts these in a single app that runs on your machine, over the folders you already have, with no account or cloud service required.

## What Better Rack does

- **Library**: scans your comic folders and keeps a browsable library of CBR and CBZ files, with thumbnails.
- **Reader**: built-in reader with zoom controls, per-comic reading progress and an on-demand rescan of a comic's pages.
- **Store**: search and download comics from GetComics.org (the only supported source at the moment), with a download queue you can watch, retry or cancel.
- **Wiki metadata**: look up comic information through the integrated wiki (powered by `better-wiki`).
- **Settings**: configure source URLs, library folders and download/output directories from the UI.
- **Remote mode**: the desktop app can connect to a remote BetterRack deployment instead of its local server, sharing that deployment's library and data.
- **Multiple targets**: Windows installer, Linux AppImage and an Android build.

## Installation

### Download a release

Prebuilt packages are published on the [GitHub Releases](https://github.com/EvilPrime98/BetterRack/releases) page for each version tag:

| Platform | Package |
|---|---|
| Windows | NSIS installer (`Better Rack-Setup-<version>.exe`) |
| Linux | AppImage |

### Run from source

Requires [Bun](https://bun.sh) (server and runtime) and [pnpm](https://pnpm.io) (client builds).

```bash
git clone https://github.com/EvilPrime98/BetterRack.git
cd BetterRack

bun install
cd react && pnpm install     # React client (default)
cd ../client && pnpm install # ultra-light-js client (alternative)
cd ..
```

Run the server and the client dev server:

```bash
bun run dev
bun run front-dev
```

Run as a desktop app (builds the React client for Electron and launches it):

```bash
bun run start-app
```

### Build distributables

```bash
bun run dist         # Windows installer, output in release/
bun run dist:linux   # Linux AppImage, run on Linux, output in release/
```

Android builds (from `client/` or `react/`) require the Capacitor Android tooling and a deployed backend:

```bash
pnpm android:sync
pnpm android:apk
```

## Configuration

Settings are read from environment variables. Place them in a `.env` file at the project root (see [`.env.example`](.env.example)).

| Variable | Purpose |
|---|---|
| `PORT` | Port the server listens on. Defaults to `3000`. Set to `0` to let the OS pick a free port. |
| `BR_API_KEY` | When set, every `/api/*` and `/read/*` request must carry this key. Needed when exposing the server beyond a trusted LAN, such as for a desktop client's remote-mode connection. Leave unset to keep the default open, LAN-trust behavior. |
| `LOG_LEVEL` | Server log level. Defaults to `info`. |
| `CLIENT_DIST_DIR` | Directory of the built client the server serves. Defaults to `./react/dist`. |
| `ELECTRON_FRONTEND` | Set to `client` to package the ultra-light-js client instead of the React one. |

The source URLs and the download/output directories are set from the Settings page in the app.

## Built with

| Tool | Purpose |
|---|---|
| [Bun](https://bun.sh) and [Hono](https://hono.dev) | Local HTTP server and API |
| [Electron](https://www.electronjs.org) and Electron Builder | Desktop shell and packaging |
| React and Vite | Default front end (an [ultra-light-js](https://www.npmjs.com/package/ultra-light-js) front end is also included) |
| [Capacitor](https://capacitorjs.com) | Android build |
| [7-Zip](https://www.7-zip.org) | Extracting CBR/CBZ archives (bundled) |
| [sharp](https://sharp.pixelplumbing.com) | Thumbnail generation |
| [Drizzle ORM](https://orm.drizzle.team) | Database access |
| better-wiki | Wiki-backed comic metadata |

## FAQ

**Does it need an internet connection?**
Reading and organizing your local library does not. The Store and the wiki metadata lookups do.

**Which store does it support?**
Currently only GetComics.org, through the GetComics API. The Store search and downloads work against that source only. Better Rack is not affiliated with GetComics.org.

**Which file formats are supported?**
CBZ and CBR.

**Which operating systems are supported?**
Windows and Linux for the desktop app, plus an Android build via Capacitor. The Android build needs a backend deployment to connect to.

**Can I use one library from several devices?**
Yes. Run a BetterRack deployment, set `BR_API_KEY` if it is reachable beyond a trusted LAN, and point the desktop app at it using remote mode.

**Where do I report a bug or ask for a feature?**
Open an issue on the [issue tracker](https://github.com/EvilPrime98/BetterRack/issues).

## Screenshots

<img width="1915" height="914" alt="Better Rack screenshot" src="https://github.com/user-attachments/assets/9e595f6d-77ad-420b-bde0-b0b183f2f381" />

<img width="1382" height="945" alt="Better Rack screenshot" src="https://github.com/user-attachments/assets/853a68e0-4d15-45d0-8659-a8a2fac442f8" />

<img width="1825" height="948" alt="Better Rack screenshot" src="https://github.com/user-attachments/assets/27a6a09b-9359-488e-9b90-84097933a1fd" />

## Contributing

Bug reports and pull requests are welcome. Open an issue first to discuss larger changes. Before submitting a pull request, run:

```bash
bun run lint
bun run typecheck
bun run test
```

## License

[GPL-3.0](LICENSE)

The Windows installer and the Linux AppImage bundle 7-Zip 26.02 (`vendor/7zip/win32` and `vendor/7zip/linux-x64`), which is distributed under the GNU LGPL with the unRAR license restriction on its RAR decoder. See [`vendor/7zip/win32/License.txt`](vendor/7zip/win32/License.txt) and [`vendor/7zip/linux-x64/License.txt`](vendor/7zip/linux-x64/License.txt).

## Author

[EvilPrime98](https://github.com/EvilPrime98)
