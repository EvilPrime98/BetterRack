# Third-party notices

The Windows installer and the Linux AppImage of Better Rack ship two third-party programs as separate executables. Better Rack starts them as child processes and does not link against them. Both can be replaced by pointing the environment variable named below at another binary.

## ffmpeg

- Used to turn the first page of a comic into a WebP thumbnail.
- Version: FFmpeg n8.1.3 (`n8.1.3-20260925`), static LGPL build for Windows x64 and Linux x64.
- Build provided by the BtbN FFmpeg-Builds project, release `autobuild-2026-09-25-15-37`: https://github.com/BtbN/FFmpeg-Builds/releases/tag/autobuild-2026-09-25-15-37
- License: GNU Lesser General Public License, version 3. The build is configured with `--enable-version3` and without `--enable-gpl` or `--enable-nonfree`. The full license text is installed next to the executable as `ffmpeg-LICENSE.txt` (in `resources/bin/`).
- Copyright: the FFmpeg developers. FFmpeg is a trademark of Fabrice Bellard, originator of the FFmpeg project. Better Rack is not endorsed by or affiliated with the FFmpeg project.
- Corresponding source code:
  - FFmpeg, tag `n8.1.3`: https://github.com/FFmpeg/FFmpeg/tree/n8.1.3 (release tarball: https://ffmpeg.org/releases/ffmpeg-8.1.3.tar.xz).
  - Build scripts, patches and the third-party libraries statically linked into the binary (including libwebp): https://github.com/BtbN/FFmpeg-Builds/tree/58cc05f33c20e3ead0ce876b72531ab482d0f981
- Replacing it: set `FFMPEG_PATH` to another ffmpeg executable (it needs the `libwebp` encoder). Without `FFMPEG_PATH`, Better Rack falls back to an `ffmpeg` found on `PATH`.

## 7-Zip

- Used to read ZIP, CBZ, CB7, RAR and CBR archives.
- Version: 7-Zip 26.02 (x64), console binaries from https://www.7-zip.org/.
- License: GNU LGPL, with the unRAR license restriction on the RAR decoder. The license texts are installed next to the executable in `resources/bin/` (`License.txt`).
- Copyright: Igor Pavlov.
- Source code: https://www.7-zip.org/download.html
- Replacing it: set `SEVEN_ZIP_PATH` to another 7-Zip executable.

Exact versions, hashes and provenance for both programs are recorded in `vendor/ffmpeg/README.md` and `vendor/7zip/README.md`.
