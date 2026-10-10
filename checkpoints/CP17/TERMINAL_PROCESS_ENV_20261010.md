# CP17: Android terminal launcher environment and lifecycle hardening

Date: 2026-10-10. Branch: feature/v2-android-build-admission-20261008.

## Verified prior baseline
CP16 Android 36 x86_64 native app-UID PRoot candidate (not production) executed a read-only Alpine command in GitHub CI 38004055930. See checkpoints/CP16/PROOT_QA_PASS_38004055930.md.

## Problem fixed at source level
TerminalSession used PRootManager.buildCommand() but did not pass PRootManager.runtimeEnvironment() to ProcessBuilder, although the native runtime expects PROOT_LOADER, PROOT_TMP_DIR, TMPDIR, and LD_LIBRARY_PATH. It also announced ready immediately after process start, before guest shell proved it could respond.

## Changes
- Apply the PRootManager runtime environment to the terminal child process.
- Reject missing native PRoot executable/loader early.
- Replace premature ready banner with shell-produced startup marker and report exit code.
- Serialize writes/lifecycle cleanup and explicitly report attempts to write to an unavailable shell.
- Use TERM=dumb for an honest pipe-based session. This is **not** PTY/terminal emulation.
- Add scripts/qa/cp17-terminal-session-contract.test.js to guard these source behaviors.

## QA scope
- Local baseline: 34/34 contracts passing; git diff --check clean.
- Android Kotlin compile and Android emulator regression: awaiting CI evidence at commit time.
- **NOT VERIFIED:** production PRoot binary (unchanged), physical ARM64, PTY, interactive full-screen programs, Codex/OpenCode guest execution, long-running session stress.
- No UI layout/source changes, no merge into main. Preserve draft PR #1.
