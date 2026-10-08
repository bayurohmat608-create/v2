# WhatsApp AI Team v2 — Budi & Rian

Standalone local-first AI team workspace with a WhatsApp-inspired web interface, terminal TUI, native Android host, and two managed AI CLI engines: OpenAI Codex and OpenCode.

## What v2 changes

v2 is the clean runtime baseline. Persistent user state is stored under `.runtime/` instead of the source tree, engine binaries are validated before startup, the backend binds to loopback by default, CORS is same-origin, and raw shell execution over HTTP is disabled.

On Android, terminal execution is handled by the native terminal bridge. The APK build consumes the canonical root `server.js`, `cli.js`, `web/`, and `personas/` at build time, so there is only one runtime source of truth.

## Requirements

- Node.js 18 or newer
- npm
- curl
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

`doctor` checks the runtime, source syntax, required assets, and both managed CLI engines. `npm test` starts an isolated server and verifies the web root, status/model/health endpoints, engine health, and auth-vault redaction.

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

The Android host is under `android/` and is versioned as **2.0.0**.

Current build baseline:

- minSdk 26
- compileSdk 36
- targetSdk 36
- JDK 17
- Android Gradle Plugin 8.13.2
- Gradle 8.13
- Supported APK ABIs: `arm64-v8a` and `x86_64`

Build ARM64 (default):

```bash
cd android
./gradlew lintDebug assembleDebug
```

Build x86_64 (useful for emulator/CI):

```bash
cd android
./gradlew -PruntimeAbi=x86_64 lintDebug assembleDebug
```

The Android build is intentionally self-contained at the runtime layer:

- **Node.js backend:** embedded Node.js Mobile 24.20.0-0 loaded through JNI from APK native libraries. No Node executable is copied to writable app storage.
- **Linux workstation:** PRoot 5.1.107.96 executes from Android's native library area with an APK-resident loader. PRoot is packaged with private dynamic `talloc` and `libandroid-shmem` dependencies.
- **Root filesystem:** official Alpine Linux 3.24.2 minirootfs for ARM64/x86_64. Gradle verifies the official SHA-256 before packaging.
- **AI engines:** Codex 0.160.1 and OpenCode 2.0.24 musl are provisioned on demand for the device ABI. The app downloads pinned HTTPS artifacts, verifies their SHA-512 before extraction, and installs them only inside the app-private Alpine rootfs.
- **Guest dependencies:** on first provisioning, Alpine installs small native dependencies such as CA certificates, `libstdc++`, `ripgrep`, `zsh`, `git`, `bash`, and `curl`. This step requires network access to the configured Alpine repositories.
- **Canonical assets:** Android packages the root `server.js`, `cli.js`, `web/`, and `personas/` at build time, so the APK and desktop runtime share one backend source of truth.

The embedded backend runs in the dedicated Android `:engine` process. AI CLI execution on Android is routed through the verified PRoot + Alpine workstation and bind-mounts only the required runtime/workspace paths. The native Android terminal uses the same PRoot workstation. Raw shell execution over `/api/terminal/exec` remains disabled.

The Gradle property `runtimeAbi` selects exactly one packaged ABI per APK; it defaults to `arm64-v8a`. AI engine archives are not bundled in the APK, which keeps the base package much smaller and avoids shipping an unused architecture. Production distribution should still prefer Android App Bundles / ABI-specific delivery.

## Antigravity policy

Antigravity is **not** bundled, authenticated, or invoked as a managed engine by v2. Current Google Antigravity terms restrict access to the service through third-party products, so the application deliberately exposes no Antigravity OAuth/API integration or automated agent execution path.

The native terminal remains a general-purpose user-controlled terminal. v2 does not install, configure, authenticate, or invoke Antigravity on the user's behalf.

## Security model


- Backend binds to `127.0.0.1` by default.
- Browser API access is same-origin instead of wildcard CORS.
- Auth credentials stay in the runtime vault and are never returned by the public vault API.
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

Original project source is licensed under Apache License 2.0. Bundled runtime components keep their own upstream licenses. See `LICENSE`, `NOTICE`, and `THIRD_PARTY_RUNTIME.md` for provenance, checksums, and attribution.
