# Contributing to Argus

Start with a reproducible problem. Search [open issues](https://github.com/archiboltmusk/Argus/issues) and [pull requests](https://github.com/archiboltmusk/Argus/pulls) before starting work.

## Run the project

Use Node.js 24 and the pnpm version pinned in [package.json](package.json). From the repository root, run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

This starts the Vite frontend. For work involving native playback, the filesystem, or platform integrations, use a desktop development build. Read [the prerequisites](README.md#prerequisites) and the relevant build steps in [CI](.github/workflows/ci.yml), then run `pnpm tauri dev`.

## Verify your change

| Change | Checks to run |
| --- | --- |
| Frontend | `pnpm run typecheck` and `pnpm test` |
| Shared Rust core | `cargo test --manifest-path argus-core/Cargo.toml` |
| Native integration | `cargo check --manifest-path src-tauri/Cargo.toml`, then exercise the affected feature on its target platform |
| Installer, platform build, or updater | Record the exact OS and architecture, build or asset used, and the install or update result |

See [repository working rules](AGENTS.md) for additional checks. In the pull request, link the issue if there is one and describe what you exercised. For playback regressions, include the steps, expected result, actual result, and whether the first frame appeared. Use a shareable fixture or a sanitized description of the source. Keep credentials and private URLs out of reports, logs, and screenshots.

See [legal and content guidance](LEGAL.md) before contributing fixtures, screenshots, or bundled assets.
