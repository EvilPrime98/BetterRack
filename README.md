# Better Rack

[![CI](https://github.com/EvilPrime98/BetterRack/actions/workflows/ci.yml/badge.svg)](https://github.com/EvilPrime98/BetterRack/actions/workflows/ci.yml)

Better Rack is a desktop app for organizing and reading a local comic book library (CBR/CBZ), with built-in search and download from a configurable comics source and metadata lookups via an integrated wiki.

## Features

- Local comic library scanning and management, with CBR/CBZ support via 7z/unrar decompression
- Built-in reader with zoom controls, per-comic reading progress, and an on-demand rescan to re-extract a comic's pages
- Store page to search and download comics from a configurable external source
- Wiki-backed metadata lookup for comic info
- Configurable settings for source URLs and download/output directories
- Desktop app can optionally connect to a remote BetterRack deployment instead of its local server, sharing that deployment's library and data
- Packaged as a Windows desktop app (NSIS installer) via Electron Builder, with an Android build via Capacitor

<img width="1916" height="917" alt="image" src="https://github.com/user-attachments/assets/21d98172-f3ba-468e-b404-33bf962fcffa" />

<img width="1915" height="914" alt="image" src="https://github.com/user-attachments/assets/9e595f6d-77ad-420b-bde0-b0b183f2f381" />

<img width="1919" height="916" alt="image" src="https://github.com/user-attachments/assets/a2594be6-9b85-4364-bd99-2fffb82890fc" />

<img width="1915" height="915" alt="image" src="https://github.com/user-attachments/assets/3b70fb94-75e8-449f-87dd-65783e31886d" />

<img width="1382" height="945" alt="image" src="https://github.com/user-attachments/assets/853a68e0-4d15-45d0-8659-a8a2fac442f8" />

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

Build client (requires backend deployment) for Android (from `client/` or `react/`, requires Capacitor Android tooling):

```bash
pnpm android:sync
pnpm android:apk
```

## License

[GPL-3.0](LICENSE)

## Author

[EvilPrime98](https://github.com/EvilPrime98)
