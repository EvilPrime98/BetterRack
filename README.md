# Better Rack

Better Rack is a desktop app for organizing and reading a local comic book library (CBR/CBZ), with built-in search and download from a configurable comics source and metadata lookups via an integrated wiki.

## Features

- Local comic library scanning and management, with CBR/CBZ support via 7z/unrar decompression
- Built-in reader with zoom controls and per-comic reading progress
- Store page to search and download comics from a configurable external source
- Wiki-backed metadata lookup for comic info
- Configurable settings for source URLs and download/output directories
- Desktop app can optionally connect to a remote BetterRack deployment instead of its local server, sharing that deployment's library and data
- Packaged as a Windows desktop app (NSIS installer) via Electron Builder, with an Android build via Capacitor

## Installation

Requires [Bun](https://bun.sh) (server/runtime) and [pnpm](https://pnpm.io) (client build).

```bash
bun install
cd client && pnpm install
```

Optional environment variables (place in a `.env` file at the project root): `PORT`, `API_URL`, `BASE_URL`, `HOST_DOMAIN`, `DOWNLOAD_DIR`, `OUTPUT_DIR`, `BR_API_KEY`.

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

## Contributing

<!-- TODO: no CONTRIBUTING.md found -->

## License

[GPL-3.0](LICENSE)

## Author

[EvilPrime98](https://github.com/EvilPrime98)
