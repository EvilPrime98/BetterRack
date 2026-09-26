# Better Rack

[![CI](https://github.com/EvilPrime98/BetterRack/actions/workflows/ci.yml/badge.svg)](https://github.com/EvilPrime98/BetterRack/actions/workflows/ci.yml)

Better Rack is a desktop app for organizing and reading a local comic book library (CBR/CBZ), with built-in search and download from a configurable comics source and metadata lookups via an integrated wiki.

## Features

- Local comic library scanning and management, with CBR/CBZ support via a bundled 7-Zip
- Built-in reader with zoom controls, per-comic reading progress, and an on-demand rescan to re-extract a comic's pages
- Store page to search and download comics from a configurable external source
- Wiki-backed metadata lookup for comic info
- Configurable settings for source URLs and download/output directories
- Desktop app can optionally connect to a remote BetterRack deployment instead of its local server, sharing that deployment's library and data
- Packaged as a Windows desktop app (NSIS installer) and a Linux desktop app (AppImage) via Electron Builder, with an Android build via Capacitor

<img width="1916" height="917" alt="image" src="https://github.com/user-attachments/assets/21d98172-f3ba-468e-b404-33bf962fcffa" />

<img width="1915" height="914" alt="image" src="https://github.com/user-attachments/assets/9e595f6d-77ad-420b-bde0-b0b183f2f381" />

<img width="1382" height="945" alt="image" src="https://github.com/user-attachments/assets/853a68e0-4d15-45d0-8659-a8a2fac442f8" />

<img width="1825" height="948" alt="image" src="https://github.com/user-attachments/assets/27a6a09b-9359-488e-9b90-84097933a1fd" />

## Installation

Requires [Bun](https://bun.sh) (server/runtime) and [pnpm](https://pnpm.io) (client build).

```bash
bun install
cd client && pnpm install //for the ultra-light-js client
cd react && pnpm install //for the React client
```

Optional environment variables (place in a `.env` file at the project root): `PORT`, `API_URL`, `DOWNLOAD_DIR`, `OUTPUT_DIR`, `BR_API_KEY`.

Set `BR_API_KEY` to require that key on every `/api/*` and `/read/*` request — needed when exposing the server beyond a trusted LAN, such as for a desktop client's remote-mode connection. Leave it unset to keep the default open, LAN-trust behavior.

## Usage

Run the server and client in development:

```bash
bun run dev     
bun run front-dev
```

Run as a desktop app (builds the client for Electron and launches it):

```bash
bun run start-app
```

Build a distributable Windows installer for the desktop app (output in `release/`):

```bash
bun run dist
```

Build a Linux AppImage (run on Linux, output in `release/`). It bundles 7-Zip and ffmpeg, so no archive or image tools are needed to open CBZ/CBR files and generate thumbnails:

```bash
bun run dist:linux
```

Build client (requires backend deployment) for Android (from `client/` or `react/`, requires Capacitor Android tooling):

```bash
pnpm android:sync
pnpm android:apk
```

## License

[GPL-3.0](LICENSE)

The Windows installer and the Linux AppImage bundle 7-Zip 26.02 (`vendor/7zip/win32` and `vendor/7zip/linux-x64`), which is distributed under the GNU LGPL with the unRAR license restriction on its RAR decoder. See [`vendor/7zip/win32/License.txt`](vendor/7zip/win32/License.txt) and [`vendor/7zip/linux-x64/License.txt`](vendor/7zip/linux-x64/License.txt).

They also bundle FFmpeg n8.1.3, an LGPL-3.0 build (no `--enable-gpl`, no `--enable-nonfree`) that runs as a separate process to generate thumbnails. Its license text ships next to the executable, and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) links to the exact corresponding source. Version, hashes and provenance are pinned in [`vendor/ffmpeg/README.md`](vendor/ffmpeg/README.md); `bun run ffmpeg:fetch` downloads the binaries before packaging, and CI checks their license. Set `FFMPEG_PATH` to use a different ffmpeg instead of the bundled one.

## Author

[EvilPrime98](https://github.com/EvilPrime98)
