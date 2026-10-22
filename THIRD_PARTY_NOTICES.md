# Third-party notices

## Harbor (MIT)

Argus is derived from Harbor (https://github.com/harborstremio/harbor). The code,
UI and Rust core are used under the MIT license below. Harbor's name, logo and
hosted services are not part of that grant and are not used.

MIT License

Copyright (c) 2026 Harbor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## FFmpeg

The macOS app bundles `ffmpeg` (version 7.1.1), built in CI from the official source at https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz with `--disable-gpl --disable-nonfree --enable-version3`, so it is licensed under the GNU LGPL v3 or later. It is used as a separate executable for subtitle auto-sync. Linked statically with OpenSSL 3 (Apache-2.0). The exact build flags are in `.github/workflows/ci.yml`. FFmpeg is a trademark of Fabrice Bellard. Source and license: https://ffmpeg.org/legal.html

The Windows and Linux builds bundle `ffmpeg` and `ffprobe` from the BtbN FFmpeg-Builds `gpl` variant (https://github.com/BtbN/FFmpeg-Builds), licensed under the GNU GPL v3 or later. They run as separate executables and are not linked into Argus. Source and build scripts: https://github.com/BtbN/FFmpeg-Builds and https://ffmpeg.org/download.html.

## PDF.js (Apache-2.0)

The Books reader renders PDF files with pdfjs-dist (https://github.com/mozilla/pdf.js),
Copyright Mozilla Foundation, used under the Apache License 2.0
(https://www.apache.org/licenses/LICENSE-2.0).

## Complete notices

The complete component list (Rust crates, npm packages, bundled binaries, shaders, fonts and
the written offer for GPL source) is shipped in the app as `THIRD-PARTY-NOTICES.txt`
(source: `src-tauri/THIRD-PARTY-NOTICES.txt`) and under Settings, Licenses and attribution
(source: `src/assets/licenses/`). This file only covers the items that need a statement of
their own.

## mpv / libmpv

Playback uses libmpv (https://mpv.io), licensed GPL-2.0-or-later or LGPL-2.1-or-later
depending on the build. It is loaded as a separate library. Source for the exact builds used
is linked in `src-tauri/THIRD-PARTY-NOTICES.txt`.

## Pokemon helper (GPL-3.0-or-later)

`tools/pokemon-engine/` is a separate helper process built from PKHeX-based sources and
declared GPL-3.0-or-later (see its `LICENSE` and `README.md`). It is not linked into the
MIT-licensed application. Keep its corresponding source with any binary that is shipped.

## Nuvio

Nuvio (https://github.com/NuvioMedia/NuvioDesktop) is GPL-3.0. Argus interoperates with
Nuvio's public sync API and addon protocol only. No Nuvio source code is copied into this
repository, and none may be.

## TMDB

This product uses the TMDB API but is not endorsed or certified by TMDB.

## Trademarks

Stremio, Nuvio, Plex, Jellyfin, Trakt, Simkl, TMDB, IMDb, OpenSubtitles, Real-Debrid,
AllDebrid, Premiumize, TorBox and other names and logos are the property of their owners and
are used only to identify compatible services. Argus is not affiliated with or endorsed by
them.
