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
