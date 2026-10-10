# CP17 production-path PRoot x86_64 verified (Android 36 emulator)

Date: 2026-10-10.
Evidence run: https://github.com/bayurohmat608-create/v2/actions/runs/38041536248
App commit: `dba4c66` (production promotion `76c6bf3`, app-UID hash fix `05841c4`, native ELF packaging preservation `dba4c66`).
Emulator job: `114183020576`.

## Verified
- All four GitHub CI jobs PASS: Node desktop, Android ARM64 APK compile/lint, Android x86_64 APK compile/lint, Android 36 x86_64 emulator runtime.
- Real Android app-UID execution selected **libproot_exec.so**, not QA-only libproot_candidate.so.
- Device-side hash check PASS, exact source x86_64 SHA-256 `0db2f9ee88cc19894029ad33d12d18d92f582884696c7ddd8ddf9f1b59c16601`.
- `CP17_PROOT_PRODUCTION_SELECTED`, `CP17_PROOT_PRODUCTION_HASH_PASS`, `CP16_PROOT_HELP_EXIT=0`, `CP16_PROOT_HELP_PASS`.
- Fixed read-only Alpine shell command ran using Budi/Rian workspace bind paths:
  `CP16_PROOT_EXEC_PASS`, `CP17_PROOT_PRODUCTION_COMMAND_PASS`, `CP16_PROOT_READONLY_SMOKE_PASS`, `CP17_PROOT_PRODUCTION_READONLY_SMOKE_PASS`.
- Embedded Node backend app cold boot/restart and read-only API gate retained.
- Gradle native packaging no longer strips this executable, ensuring byte-for-byte hash integrity.

## Not verified
- Android TerminalSession actual UI-driven interactive session, PTY, user command input, long-running sessions.
- ARM64 **runtime** on physical Android hardware; ARM64 APK build passing is not proof.
- Production agents Codex/OpenCode running end-to-end, Zovia live execution, secure cross-room sharing.
- Physical device 16 KiB native runtime page compatibility.
- Do not merge draft PR #1 into main until independently validated release gates.

## Prior emulator failures resolved
- 38039362509: APK ELF integrity hash check exit 48.
- 38040966030: app-UID hash check revealed installed file SHA mismatch after AGP native symbol stripping.
- 38041536248: keepDebugSymbols for APK-native executable produced matching device SHA and successful guest command.

Rollback in isolated worktree: `git restore --source=83d50f0 -- android/app/src/main/jniLibs/x86_64/libproot_exec.so`; remove keepDebugSymbols promotion if reverting.
