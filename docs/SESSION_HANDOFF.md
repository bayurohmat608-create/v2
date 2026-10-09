# SESSION HANDOFF • WhatsApp Agent V2

## Wajib dibaca pertama kali saat sesi baru
1. Baca docs/BLUEPRINT_MASTER_V2.md untuk keputusan produk/arsitektur.
2. Baca docs/CHECKPOINT_TRACKER.md untuk 25 checkpoint dan setiap ✅ yang punya bukti.
3. Baca dokumen ini untuk branch, status, batas implementasi dan next task.
4. Baca checkpoints/CP18/PARITY_MATRIX.md sebelum mengubah frontend WA.
5. Lakukan status check, unit tests dan cek toolchain. **Jangan klaim Android-ready dari pengujian Node.**

## Lokasi dan branch
- Repository: https://github.com/bayurohmat608-create/v2
- Base pinned SHA: d3f74a4776d43acfa22f4a3ea2a73c7809d833dc
- Last verified parent implementation commit: a68f42291b4c4aa315bacb1ea0ede134c6a86281 (local originally).
- Worktree aktif tahap ini: /home/sprite/v2-checkpoints-20261008
- Working branch: feature/v2-blueprint-tracker-cp19-cp20-20261008
- Exclusive Sprite: bay-chat-agent-isolated-qa-1008 / sprite-542a3150-c1cc-4979-a784-af9a7a04a73d.
- Jangan sentuh, hentikan service, overwrite, atau reset Sprite lain.
- Worktree /home/sprite/v2-master-impl memuat file untracked dari pekerjaan lain; **jangan edit/hapus file di sana**.

## Sumber acuan
- Blueprint induk v2.0 berasal dari artefak user sebelumnya (2047 baris), direproduksi di docs/BLUEPRINT_MASTER_V2.md tanpa mendesain ulang UI.
- Sumber Droide adalah ZIP referensi read-only di /home/sprite/droide-reference/read-only, bukan source yang boleh diedit.
- Android V2 main saat bootstrap: d3f74a4. Main, source asli, dan PTY worktree lain tidak disentuh.

## Sudah diimplementasikan dan diuji pada branch ini
- ✅ CP00: baseline SHA dan empat source hashes; qa:baseline script.
- ✅ CP18 parsial: 26 item V1 parity inventory dan 15 source-symbol regression guards.
- ✅ CP19 parsial: Zovia persona, team registry, scoped helper, GET /api/team metadata, 409 when unsupported Zovia message.
- ✅ CP19 parsial: isolated PrivateRoomStore storage with 0600 file and 0700 parent dir, atomic staging/rename, read deny, idempotency, restart tests.
- ✅ CP20 parsial: structured action validation and pending registry; no execution or spoofed completion.
- Refer to exact tests in scripts/qa/; rerun them before editing statuses.

## BELUM siap (JANGAN centang penuh)
- Real Zovia conversation, room-scoped authenticated API, model/engine wiring, scheduler and proof-of-execution.
- CP20 real mention/delegate/share dispatch, persisted evidence and owner approval mechanism.
- Native Droide PTY integration to release source, Sora editor, LSP, Git, Ubuntu, Antigravity managed integration.
- Physical ARM64 device QA, chat/terminal interaction, full feature parity and long-running lifecycle; CI builds and x86_64 emulator startup/Node HTTP are now verified (run 37878367182).
- V2 legacy /api/chats and /api/events currently can surface Budi/Rian private messages to local UI; no Zovia messages are connected to those APIs.
- V2 frontend uses unverified E2EE wording in security banner. Do not repeat that as a real security property.

## Rencana checkpoint berikutnya
1. Complete CP19: server-authenticated principal identity and scoped per-room HTTP/SSE with room-store integration, backwards compatibility/migration tests.
2. CP19: integrate Zovia into chat and group UI once ACL is proven; do not change UX without user permission.
3. CP20: trusted action executor, idempotent event journal, real 'panggil Rian' group event, no fake DONE.
4. CP01/02: merge PTY from separately audited Droide QA worktree after verifying licenses/JNI and Android build.
5. Push commit on independent GitHub branch. Main stays untouched until review and Android gates.

## Exact repeatable tests
- npm run qa:baseline  (Node syntax + unit/HTTP contract tests)
- npm run test:contracts
- git diff --check
- For APK QA, require JDK17, matching Android SDK, Gradle, emulator/device; unavailable tests must be reported as BLOCKED, not PASS.

## Git/merge rules
- Never force push main and never overwrite another Sprite/worktree.
- Update docs/CHECKPOINT_TRACKER.md and this file in the SAME commit as each code change.
- Never mark checklist items done merely because a blueprint specifies them.
- Include source location, real test result, revision SHA, and rollback path in handoff.


## CP16 build admission continuation (2026-10-08)
- Active new worktree: /home/sprite/v2-build-qa-1008; branch feature/v2-android-build-admission-20261008.
- Toolchain is isolated at /home/sprite/v2-build-toolchain-1008: Temurin JDK17, Gradle 8.13, Google Android SDK36, Build Tools36, NDK27.0.12077973 and CMake3.22.1; official archive hashes matched.
- Historical main CI 37745673751 built ARM64 and x86_64 successfully but failed emulator smoke because /bin/sh rejected set -euo pipefail before the application started. This failure did NOT establish an application crash.
- Fixed CI smoke to POSIX set -eu, guarded by scripts/qa/android-ci-smoke-contract.test.js.
- 20/20 JavaScript backend, HTTP, and documentation tests passed; no APK success is claimed.
- Local Gradle build and workflow run 37775717356 on the older verified branch are in progress. A separate CI branch run will follow the fix.
- No other Sprite or worktree was modified; the main branch is untouched. Original rollback point: 0f3b81d.


## LATEST CP16 BUILD HANDOFF — 2026-10-08
- Worktree: /home/sprite/v2-build-qa-1008. Only Sprite bay-chat-agent-isolated-qa-1008, ID sprite-542a3150-c1cc-4979-a784-af9a7a04a73d. Never interfere with other sprites or worktrees.
- Remote CP16 branch prior fix: feature/v2-cp16-build-fix-20261008 @ 265473f1e312ea93c29f421d8f77fb9060978e07; local HEAD originally 83d1767. GitHub main unchanged.
- CI run 37778072039: Desktop, Android ARM64, x86_64 lintDebug and assembleDebug and zipalign succeeded. Emulator failed BEFORE app install. Runner executed each multiline YAML line via independent sh -c; variable APK was unavailable when test -f ran.
- New verified fix: YAML script now invokes a single bash scripts/qa/android-emulator-smoke.sh, keeping shell state and diagnostics. Mocked APK/ADB/HTTP success and failures tested; npm run qa:baseline 22/22 PASS.
- Local Sprite Gradle failed after 42m51s because Build Tools 35.0.0 absent and license not accepted. Separate from CI builds; JDK17 SDK36 BuildTools36 NDK27 CMake3.22.1 provisioned to /home/sprite/v2-build-toolchain-1008.
- Next task: push current CP16 fix to remote feature branch, dispatch CI, verify emulator backend reaches HTTP /api/status and logcat. Real Android app runtime NOT VERIFIED.
- Fly.io parked by user: flyctl v0.4.114 installed in /home/sprite/flyio-baystudio-cli, but Fly auth whoami was not authenticated. Sprite URL 502 was a missing web service, Sprite commands still work. Do not pursue auth now.
- Continue respecting V1 parity, no unapproved UI edits, strict private chat ACL, Antigravity policy gate. Source of truth docs/BLUEPRINT_MASTER_V2.md and docs/CHECKPOINT_TRACKER.md.

## CP16 run 37805223698 diagnosis (2026-10-09)
- CI Android ARM64/x86_64 + Desktop passed. Emulator APK install succeeded; MainActivity `am start -W` returned timeout; `/api/status` was unreachable for 90 attempts, causing smoke test exit 22. Not proof of a V2 Java/native crash.
- Original logcat began only after timeout; system Bluetooth/phone crashes are not clearly from our app. Evidence: checkpoints/CP16/RUNTIME_FAILURE_37805223698.md.
- CP16 smoke script now captures live logcat from before app launch and app/service diagnostics after failure, uses non-blocking start, and retains bounded retry with negative tests. `npm run qa:baseline` 22/22 passed locally.
- Next: push this diagnostic-only revision to separate feature branch, rerun CI, inspect app-scoped logcat, then fix actual startup if indicated. No V2 UI code changed.


## LATEST CP16 VERIFIED HANDOFF — 2026-10-09
- Active published branch `feature/v2-android-build-admission-20261008` on PR #1 (draft). HEAD `ef038faf1e245ef37703d521e69af655cf1fb032` at green CI run `37878367182`.
- Isolated Sprite `bay-chat-agent-isolated-qa-1008`, publication worktree `/home/sprite/v2-cp16-gh-publish-1009`. Preserve prior worktrees and `main`.
- **CI PASS:** Desktop, ARM64 and x86_64 build+APK alignment, Android 36 x86_64 emulator KVM, real installed MainActivity, embedded Node.js `/api/status` health on attempt 5.
- App-specific blocker was host Android resolving Alpine guest `/bin/sh -> /bin/busybox` incorrectly. Fixed by shared `RootfsShellValidator` used by WorkstationManager and PRootManager. Earlier `agent/` APK asset omission and KVM restrictions were also fixed.
- Evidence and verified APK SHA-256: `checkpoints/CP16/RUNTIME_PASS_37878367182.md`; `npm run qa:baseline` **26/26 PASS**.
- **Do not claim CP16 fully complete or app ready for release:** physical ARM64, real chat/terminal/UI testing, privacy auth E2E, model/engine provider tests and full native alignment remain pending.
- Next: obtain physical ARM64 test evidence and verify real chat, native terminal/PRoot, agent workflows, rollback/reopen, logs and permissions before merging PR #1.

## CP16 recovery QA extension (2026-10-09)
- After green Android 36 emulator startup run 37879056956, added a non-destructive second force-stop/relaunch, backend `/api/status` health probe and metadata-only `/api/team` schema gate to `scripts/qa/android-emulator-smoke.sh`.
- CI artifacts now include `runtime-restart-status.json` and `runtime-team.json`. This is deliberately NOT a real agent/PRoot/physical-device test.
- Local `npm run qa:baseline` 26/26 PASS; next verification is a fresh GitHub CI emulator run after publishing the new workflow and script.
