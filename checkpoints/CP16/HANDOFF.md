# CP16 • Android build admission / emulator smoke

## Verified subtasks
- ✅ Java 17, Gradle8.13, SDK36, Build Tools36, NDK27, CMake3.22.1 available in isolated Sprite workdir. All Google archive SHA1 hashes match official repository metadata.
- ✅ Historical main CI 37745673751 successfully assembled ARM64 and x86_64 APKs, but emulator test script failed before app launch because /bin/sh lacked pipefail.
- ✅ CI action emulator smoke now uses POSIX set -eu.
- ✅ scripts/qa/android-ci-smoke-contract.test.js parses emulator script through /bin/sh -n.
- ✅ scripts/qa/build-android-debug.sh runs lintDebug + assembleDebug using isolated toolchain.

## Remaining acceptance gates
- ⬜ Current branch APK build confirmed and sha256 recorded.
- ⬜ Android API36 x86_64 emulator actually starts Activity and embedded Node HTTP service.
- ⬜ Physical ARM64 device install, chat and editor/terminal validation.
- ⬜ Native 16KiB alignment checks and full source feature parity.

## Sources and rollback
- Old CI run: https://github.com/bayurohmat608-create/v2/actions/runs/37745673751
- Old branch CI run: https://github.com/bayurohmat608-create/v2/actions/runs/37775717356
- Local build log: checkpoints/CP16/android-debug-build.log (until BUILD_EXIT recorded, incomplete).
- Worktree: /home/sprite/v2-build-qa-1008; parent SHA: 0f3b81d441dedac81f6ef13b69de3cd414753d3d.
- No UI redesign or changes to main.


## LATEST CP16 BUILD HANDOFF — 2026-10-08
- Worktree: /home/sprite/v2-build-qa-1008. Only Sprite bay-chat-agent-isolated-qa-1008, ID sprite-542a3150-c1cc-4979-a784-af9a7a04a73d. Never interfere with other sprites or worktrees.
- Remote CP16 branch prior fix: feature/v2-cp16-build-fix-20261008 @ 265473f1e312ea93c29f421d8f77fb9060978e07; local HEAD originally 83d1767. GitHub main unchanged.
- CI run 37778072039: Desktop, Android ARM64, x86_64 lintDebug and assembleDebug and zipalign succeeded. Emulator failed BEFORE app install. Runner executed each multiline YAML line via independent sh -c; variable APK was unavailable when test -f ran.
- New verified fix: YAML script now invokes a single bash scripts/qa/android-emulator-smoke.sh, keeping shell state and diagnostics. Mocked APK/ADB/HTTP success and failures tested; npm run qa:baseline 22/22 PASS.
- Local Sprite Gradle failed after 42m51s because Build Tools 35.0.0 absent and license not accepted. Separate from CI builds; JDK17 SDK36 BuildTools36 NDK27 CMake3.22.1 provisioned to /home/sprite/v2-build-toolchain-1008.
- Next task: push current CP16 fix to remote feature branch, dispatch CI, verify emulator backend reaches HTTP /api/status and logcat. Real Android app runtime NOT VERIFIED.
- Fly.io parked by user: flyctl v0.4.114 installed in /home/sprite/flyio-baystudio-cli, but Fly auth whoami was not authenticated. Sprite URL 502 was a missing web service, Sprite commands still work. Do not pursue auth now.
- Continue respecting V1 parity, no unapproved UI edits, strict private chat ACL, Antigravity policy gate. Source of truth docs/BLUEPRINT_MASTER_V2.md and docs/CHECKPOINT_TRACKER.md.


## VERIFIED UPDATE — 2026-10-09 (overrides earlier pending CI claims)
- ✅ Local contract tests: **26/26 PASS**.
- ✅ CI run 37878367182: Desktop, Android ARM64/x86_64 build and 16 KiB APK ZIP alignment **PASS**.
- ✅ Android API 36 x86_64 emulator boot, APK install, MainActivity startup and embedded Node `/api/status` HTTP health **PASS** after host-safe Alpine/PRoot `/bin/sh` fix.
- ✅ APK SHA-256 and logcat evidence: [RUNTIME_PASS_37878367182.md](RUNTIME_PASS_37878367182.md).
- ⬜ Physical ARM64 end-to-end UI, PRoot and real AI-agent execution **NOT TESTED**. CP16 as a whole remains **PARTIAL**.
- Active draft PR: https://github.com/bayurohmat608-create/v2/pull/1
