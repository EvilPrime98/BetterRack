# Bundled ffmpeg

FFmpeg **n8.1.3** (`n8.1.3-20260925`) static **LGPL** builds by [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds), release `autobuild-2026-09-25-15-37`. They are shipped with the Windows installer and the Linux AppImage and used for one thing: turning the first page of a comic into a WebP thumbnail (`ThumbnailModel`).

The binaries are 134 MB (Windows) and 142 MB (Linux), over GitHub's 100 MB file limit, so they are **not committed**. `bun run ffmpeg:fetch` downloads them, checks every SHA-256 below and installs them into this folder. `bun run dist`, `dist:linux` and `dist:client` run it first. Only the license text is committed.

| File | SHA-256 |
|---|---|
| `ffmpeg-n8.1.3-win64-lgpl-8.1.zip` (download) | `ed669810ca09ccf1f210d80b79445f70da68da4856a3a0f43e0ab9b2217c9777` |
| `win32/ffmpeg.exe` | `e3f884883b1509a0958afe375a80ac2791883553108f217df1968982b3fa0137` |
| `ffmpeg-n8.1.3-linux64-lgpl-8.1.tar.xz` (download) | `703f9f70ae6bfd9f676292d4cac9d8ebda9e17bfc090088882ffc020ffbf384e` |
| `linux-x64/ffmpeg` | `e5beb99958e50318c9fbe2ee532e6bd768afb07e63606dc156c0ade5933dbe64` |
| `win32/ffmpeg-LICENSE.txt`, `linux-x64/ffmpeg-LICENSE.txt` | `da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768` |

- Downloads: `https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-09-25-15-37/<archive>`.
- Corresponding source: FFmpeg tag [`n8.1.3`](https://github.com/FFmpeg/FFmpeg/tree/n8.1.3), and the [build scripts at the release commit](https://github.com/BtbN/FFmpeg-Builds/tree/58cc05f33c20e3ead0ce876b72531ab482d0f981), which fetch the third-party libraries statically linked into the binary (including libwebp).
- License: LGPL-3.0 (`--enable-version3`). Neither `--enable-gpl` nor `--enable-nonfree` is set, and `--enable-libwebp` is. The build also carries codecs Better Rack never uses (H.264 through OpenH264, AV1, and others), which is the trade-off of shipping a prebuilt binary instead of a minimal build.
- Packaging: each platform's folder is packaged into `resources/bin/` by its own `win` / `linux` block in `electron-builder.config.js`. The Electron main process passes the path to the server as `FFMPEG_PATH`. `THIRD_PARTY_NOTICES.md` is packaged into `resources/` and points to the source above.
- `FFMPEG_PATH` overrides the bundled binary. Without it the server uses an `ffmpeg` on `PATH`, so dev mode with a system install keeps working.

## License check

`bun run ffmpeg:verify [path]` runs `ffmpeg -version` and `ffmpeg -L` and fails if the configuration contains `--enable-gpl` or `--enable-nonfree`, lacks `--enable-libwebp`, or the license output is not LGPL. `ffmpeg:fetch` runs it on the host's binary, and the `ffmpeg-license` workflow runs it on Windows and Linux for every change to this folder or its scripts, so a non-LGPL build can't be pinned unnoticed.

## Upgrading

Pick a new release on the BtbN releases page, update the tag and the archive names in `scripts/ffmpeg-release.ts`, replace the hashes there and in the table above (the download page lists each archive's SHA-256; hash the extracted files yourself), update `THIRD_PARTY_NOTICES.md`, and run `bun run ffmpeg:fetch`, `bun run ffmpeg:verify` and `bun test src/models/thumbnail scripts`.

This is engineering analysis, not legal advice. If BetterRack is distributed commercially, get a real opinion.
