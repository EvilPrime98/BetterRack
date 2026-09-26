# Bundled 7-Zip

Official 7-Zip **26.02 (x64)** console binary, shipped with the Windows installer and used for every archive type (ZIP, CBZ, CB7, RAR, CBR).

| File | SHA-256 |
|---|---|
| `win32/7z.exe` | `83967f1b02b43c4efeda302795722c809e0e81b8307de73558d10484d5676a7d` |
| `win32/7z.dll` | `69fd4df057985c40e510e2fac182881c7f85e90aa13ec703f763a8fdb2ce61f8` |
| `win32/License.txt` | `519ac0a4bded9c18ea02e0afb71f663d8c47373bd9facd3ac96a79f51d77765d` |

- Source: https://www.7-zip.org/ (release dated 2026-06-25).
- `7z.exe` needs `7z.dll` in the same directory.
- Packaged into `resources/bin/` by `electron-builder.config.js`; the Electron main process passes the path to the server as `SEVEN_ZIP_PATH`.
- License: LGPL, with the unRAR license restriction on the RAR decoder. See `win32/License.txt`.

To upgrade, replace the three files from an official install, update the version and hashes above, and run `bun test src/models/decompressor`.
