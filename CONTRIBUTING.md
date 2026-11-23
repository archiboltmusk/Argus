# Contributing to Argus

Thank you for your interest in contributing to Argus! Argus is a modern, privacy-focused, cross-platform media player and streaming hub. We welcome contributions that maintain our high standards of software quality, user privacy, and system security.

---

## 1. Contributor Standards & Safety Guidelines

To protect the integrity of the project and ensure all contributions serve the community safely:

### Developer Certificate of Origin (DCO)
All commits submitted via Pull Requests must adhere to the [Developer Certificate of Origin (DCO) 1.1](https://developercertificate.org/):
```text
Developer Certificate of Origin
Version 1.1

By making a contribution to this project, I certify that:
(a) The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
(b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications; or
(c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.
(d) I understand and agree that this project and the contribution are public and that a record of the contribution is maintained indefinitely.
```
Add your sign-off to commits using `git commit -s` or by including `Signed-off-by: Your Name <your.email@example.com>` in your commit message.

### Security & Privacy Non-Negotiables
- **Zero Surveillance / Tracking**: Do not add telemetry, tracking pixels, behavioral logging, or analytics.
- **No Hardcoded Credentials**: Never commit API keys, personal secrets, client secrets, or auth tokens.
- **On-Device Independence**: Features must run locally and independently on each target OS without central lock-in.
- **Supply Chain Hygiene**: Add dependencies only when necessary. Unpinned or unverified external packages will not be merged.

---

## 2. Development Setup

Argus requires Node.js 24 and the pinned pnpm version specified in [package.json](package.json).

```sh
# Clone the repository
git clone https://github.com/archiboltmusk/Argus.git
cd Argus

# Install dependencies with strict lockfile verification
pnpm install --frozen-lockfile

# Launch the desktop frontend in development mode
pnpm dev
```

For native platform development (macOS, Windows, Linux, Android, iOS):
- **macOS / iOS / tvOS / visionOS**: Xcode 16+ and Homebrew `mpv` `pkg-config`.
- **Windows**: Visual Studio 2022 / C++ Build Tools and Rust `x86_64-pc-windows-msvc` / `aarch64-pc-windows-msvc`.
- **Linux**: GTK3, WebKit2GTK 4.1, libmpv development libraries.
- Run `pnpm tauri dev` to test native IPC bindings.

---

## 3. Pre-Flight Verification Checklist

Before opening a pull request, ensure your local changes pass all gates:

| Scope | Command | Purpose |
| :--- | :--- | :--- |
| **TypeScript / UI** | `pnpm run typecheck` | Validates strict TypeScript compilation (0 errors allowed) |
| **Unit Test Suite** | `pnpm test` | Runs all 869+ unit and integration test suites |
| **Rust Core** | `cargo fmt --check && cargo clippy --all-targets` | Enforces idiomatic Rust formatting and clippy lints |
| **Security Audit** | `pnpm audit` and `cargo audit` | Checks for vulnerable dependencies |

---

## 4. Branch Protection & Review Policy

1. **Pull Request Isolation**: All PRs run in isolated sandboxes with read-only tokens (`permissions: contents: read`).
2. **Automated Status Gates**: Every PR must pass CodeQL static analysis, Gitleaks secret scanning, and automated test runners before being merged.
3. **Squash & Clean History**: Commits will be squashed and merged with clear semantic commit messages (`feat:`, `fix:`, `refactor:`, `perf:`).
