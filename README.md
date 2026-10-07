# WhatsApp AI Team v2 — Budi & Rian

Standalone local-first AI team workspace with a WhatsApp-inspired web interface, terminal TUI, native Android host, and three CLI engine integrations: Google Antigravity, OpenAI Codex, and OpenCode.

## What v2 changes

v2 is the clean runtime baseline. Persistent user state is stored under `.runtime/` instead of the source tree, engine binaries are validated before startup, the backend binds to loopback by default, CORS is same-origin, and raw shell execution over HTTP is disabled.

On Android, terminal execution is handled by the native terminal bridge. The APK build consumes the canonical root `server.js`, `cli.js`, `web/`, and `personas/` at build time, so there is only one runtime source of truth.

## Requirements

- Node.js 18 or newer
- npm
- curl
- Google Antigravity CLI (`agy`) installed and available on `PATH`
- Linux, macOS, Android/Termux, or another compatible Node.js host

OpenAI Codex CLI and OpenCode CLI are installed as project dependencies and select their native package for the current OS/CPU.

## Install

```bash
git clone https://github.com/bayurohmat608-create/v2.git whatsapp-ai-team-v2
cd whatsapp-ai-team-v2
./install.sh
```

The installer fails loudly if a required engine is missing or not executable. For an intentionally partial environment:

```bash
ALLOW_PARTIAL_ENGINES=1 ./install.sh
```

## Run

Web app:

```bash
./start.sh
```

Default address: `http://127.0.0.1:3000`.

Terminal TUI:

```bash
./start.sh --terminal
```

The server binds to loopback by default. Set `HOST` explicitly only when you intentionally need another bind address.

## Verify

```bash
npm run doctor
npm test
```

`doctor` checks the runtime, source syntax, required assets, and all three CLI engines. `npm test` starts an isolated server and verifies the web root, status/model/health endpoints, engine health, and auth-vault redaction.

## Runtime layout

```text
.runtime/
├── auth_vault/
├── chat_data.json
├── chat_files/
├── workspaces/
│   ├── budi/
│   └── rian/
├── wakelock.log
└── ...
```

Runtime files, credentials, logs, local engine links, build outputs, APKs, and archives are ignored by Git.

## Android

The Android host is under `android/`.

Current build baseline:

- minSdk 26
- compileSdk 36
- targetSdk 36
- JDK 17
- Android Gradle Plugin 8.13.2
- Gradle 8.13

Build:

```bash
cd android
./gradlew assembleDebug
```

The build task generates runtime assets from the repository root before packaging. The in-app terminal uses the native Android terminal path; `/api/terminal/exec` intentionally does not provide a raw HTTP shell in v2.

## Security model

- Backend binds to `127.0.0.1` by default.
- Browser API access is same-origin instead of wildcard CORS.
- Auth credentials stay in the runtime vault and are never returned by the public vault API.
- Antigravity runs with sandbox restrictions and accept-edits mode instead of the dangerous permission-bypass flag.
- Codex uses automatic approval with its workspace-write sandbox instead of the full sandbox bypass flag.
- Raw shell execution through the HTTP backend is disabled.
- Android WebView grants microphone/camera resources only when the corresponding Android runtime permission is granted.
- Android app backup is disabled so private runtime/auth state is not copied by Android backup.

## Main components

```text
server.js                     Local HTTP/SSE backend and engine orchestration
cli.js                        Terminal TUI
web/                          WhatsApp-inspired web UI
personas/                     Budi and Rian persona instructions
scripts/doctor.sh             Environment/runtime diagnostics
scripts/smoke-test.sh         Automated backend smoke tests
scripts/publish_release.sh    Release helper using authenticated GitHub CLI
android/                      Native Android host, runtime, PRoot and terminal
```

## Release

Release helper requires the GitHub CLI and an existing authenticated `gh` session. It never accepts a GitHub token as a positional argument.

```bash
scripts/publish_release.sh bayurohmat608-create/v2 v2.0.0 "WhatsApp AI Team v2"
```

Optional asset paths may be added after the title.

## License

Project source is licensed under Apache License 2.0. See `LICENSE` and `NOTICE` for license and third-party attribution information.
