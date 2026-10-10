# CP17 staged x86_64 PRoot production-path promotion

Date: 2026-10-10.

## Change and rollback
- x86_64 APK-native libproot_exec.so replaced with the **byte-identical** clean PRoot QA candidate SHA-256 `0db2f9ee88cc19894029ad33d12d18d92f582884696c7ddd8ddf9f1b59c16601`; rollback is `git restore --source=83d50f0 -- android/app/src/main/jniLibs/x86_64/libproot_exec.so` in a dedicated clean worktree.
- Its DT_NEEDED links to packaged libtalloc_candidate.so, SHA-256 `79ab103b2b719dbf058c43b5c067cadbb78c6d5511627d97ce9eeebc1ab288e7`, not legacy libtalloc_v2.so. Both native libraries are stored in the APK's executable lib directory.
- ARM64 libproot_exec.so remains byte-for-byte unchanged (current repository SHA-256 `0215493b9b088722cfdcfc6fa428ecd6bd7996fa85670f2dff9fd06acd287297`).
- PRootManager and NodeRuntimeManager already point to production libproot_exec.so; no UI change.

## QA admission
- scripts/qa/android-proot-smoke.sh now probes **production file** through unprivileged `adb shell -T run-as com.bossbayu.aiteam sh`, verifies SHA on-device, and executes fixed **read-only** Alpine shell expression with PRootManager-equivalent Budi and Rian bind mounts, plus /dev /proc /sys.
- script maintains historical CP16 markers for older contract tests and emits CP17_PROOT_PRODUCTION_SELECTED, CP17_PROOT_PRODUCTION_HASH_PASS, CP17_PROOT_PRODUCTION_COMMAND_PASS, CP17_PROOT_PRODUCTION_READONLY_SMOKE_PASS.
- Baseline 36/36 contract tests pass locally; requires GitHub Actions real Android 36 x86_64 emulator proof before declaring production PRoot working.
- No chat/message/auth secrets are read or uploaded. Raw HTTP terminal execution remains disabled.
- No actual Android TerminalSession UI instrumentation, PTY, physical ARM64, or agent execution proof. PR #1 must remain draft until these are independently verified.
