# Bundled 7-Zip

Official 7-Zip **26.02 (x64)** console binaries, shipped with the Windows installer and the Linux AppImage and used for every archive type (ZIP, CBZ, CB7, RAR, CBR).

| File | SHA-256 |
|---|---|
| `win32/7z.exe` | `83967f1b02b43c4efeda302795722c809e0e81b8307de73558d10484d5676a7d` |
| `win32/7z.dll` | `69fd4df057985c40e510e2fac182881c7f85e90aa13ec703f763a8fdb2ce61f8` |
| `win32/License.txt` | `519ac0a4bded9c18ea02e0afb71f663d8c47373bd9facd3ac96a79f51d77765d` |
| `linux-x64/7zz` | `1676a968815b92e865bc0ffeecee3fa284ba4402bf23dc2bec2412c4b502e922` |
| `linux-x64/License.txt` | `1790374e5352329cedb46ee3808930a88e9ca2f08b82b10fcf5cf605d2c301b1` |

- Source: https://www.7-zip.org/ (release dated 2026-06-25). The Linux files come from `7z2602-linux-x64.tar.xz` (SHA-256 `41aaba7b1235304ab5aa0624530c67ae829496cd29e875925271efdccc28c03e`).
- `7z.exe` needs `7z.dll` in the same directory.
- `linux-x64/7zz` is committed executable (mode 755); `.gitattributes` marks it binary.
- Each platform's folder is packaged into `resources/bin/` by its own `win` / `linux` block in `electron-builder.config.js`; the Electron main process passes the path to the server as `SEVEN_ZIP_PATH`.
- License: LGPL, with the unRAR license restriction on the RAR decoder. See `win32/License.txt` and `linux-x64/License.txt`.

To upgrade, replace the files from an official release, update the version and hashes above, and run `bun test src/models/decompressor`.
