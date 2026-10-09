# WHATSAPP AGENT V2 • CHECKPOINT TRACKER

Master: [Blueprint v2.0](BLUEPRINT_MASTER_V2.md) | [Latest session handoff](SESSION_HANDOFF.md)
Base: d3f74a4776d43acfa22f4a3ea2a73c7809d833dc
Active CP16 branch: feature/v2-android-build-admission-20261008 (local)

## Rules (mandatory every checkpoint)
- ✅ [x] = actual code in this branch + relevant test passing + evidence path. Never infer APK success from backend tests.
- 🟡 [ ] = partially built. ⬜ [ ] = not implemented. ⛔ [ ] = blocked or failed.
- Update this file AND SESSION_HANDOFF.md together on every checkpoint commit. Reference test commands/commit.
- Check whole CP as complete only if ALL acceptance gates pass; otherwise mark partial and check individual verified subtasks.

## CP00 Baseline immutable • PARTIAL
- ✅ [x] V2 baseline SHA locked. Evidence: checkpoints/CP00/BASELINE_SHA.txt.
- ✅ [x] Source hashes recorded. Evidence: checkpoints/CP00/SOURCE_HASHES.sha256.
- ✅ [x] Repeatable backend contract QA command npm run qa:baseline.
- ⬜ [ ] Baseline Android APK build and installed runtime reproducibility.

## CP01 Native runtime admission
- ⬜ [ ] Node JNI + Alpine PRoot Android health and 16K ELF/ABI gate.
- ⬜ [ ] UI loads without waiting on native bootstrap failures.

## CP02 Droide PTY integration
- 🟡 [ ] PTY prototype exists in separate QA worktree, NOT merged to this branch.
- ⬜ [ ] Android interactive terminal + JNI + IME verified on real device.
- ⬜ [ ] License/provenance audits and native test.

## CP03 Execution supervisor
- ⬜ [ ] Process lease, timeout, bounded streams, cancellation.
- ⬜ [ ] Crash reconciliation, idempotent mutation and zombie checks.

## CP04 Unified workspace authority
- ⬜ [ ] Project store, import progress, revision and shared mount.
- ⬜ [ ] Sora/terminal/agent edit without lost changes.

## CP05 EngineRegistry & ModelCatalog
- ⬜ [ ] Binary probes, auth state, versioned model discovery and cache.
- ⬜ [ ] Same truth across terminal, settings and model picker.

## CP06 Codex managed adapter
- ⬜ [ ] Official login, structured stream, approval, cancel and resume.
- ⬜ [ ] Genuine task artifacts and device QA.

## CP07 OpenCode managed adapter
- ⬜ [ ] Provider auth, current model discovery, SSE, cancel and real task.

## CP08 Ubuntu ARM64
- ⬜ [ ] glibc runtime, shared mounts, keyring/D-Bus tested on ARM64 device.

## CP09 Antigravity optional adapter
- ⬜ [ ] Manual CLI detection and compatibility verified.
- ⬜ [ ] Policy/terms gate; official login and discovery only when permitted.
- ⬜ [ ] No copied/token-scraped credentials or fake ready models.

## CP10 Orchestrator
- ⬜ [ ] Durable scheduler, file leases, two real parallel jobs and approval.

## CP11 Native WhatsApp UI
- ⬜ [ ] Native Compose UX golden parity and restart/history E2E.

## CP12 Sora editor
- ⬜ [ ] Tabs, IME, buffer authority, save/undo, diff approval.

## CP13 Git + LSP
- ⬜ [ ] Status/diff/worktree and real LSP diagnostics.

## CP14 Build & diagnostics
- ⬜ [ ] Artifact proofs, real exit codes and logs for build/test.

## CP15 Lifecycle hardening
- ⬜ [ ] Low-memory, background, rotation, thermal and recovery tests.

## CP16 Android E2E • PARTIAL
- ✅ [x] New single Bash-process emulator runner script and mocked success/negative tests in scripts/qa/android-ci-smoke-contract.test.js.
- ✅ [x] Isolated Android build helper checks Java 17, SDK36, NDK27 and CMake3.22.1: scripts/qa/build-android-debug.sh.
- ✅ [x] CI 37778072039 builds and zipaligns ARM64 and x86_64 APKs successfully.
- ⛔ [ ] Local Gradle build blocked by missing/unlicensed Build Tools 35.0.0.
- ⛔ [ ] CI run 37805223698: APK installed but Activity startup timed out; port 3000 did not respond after 90 health probes. Continuous logcat capture added, awaiting next CI.
- ✅ [x] **CI 37878367182 PASS:** Desktop, ARM64/x86_64 build, APK zipalign 16 KiB, Android API 36 x86_64 emulator, actual `/api/status` HTTP response. Evidence: checkpoints/CP16/RUNTIME_PASS_37878367182.md.
- ✅ [x] Rootfs `/bin/sh` guest-absolute symlink guard shared by Alpine and PRoot; Android `agent/` assets bundled; KVM-enabled CI; 26/26 contract QA passing.
- ⛔ [ ] CI 37885599280 restart gate failed with code 23: Android delivered the relaunch to a stale top Activity instead of starting a new process. Evidence: checkpoints/CP16/RESTART_FAILURE_37885599280.md.
- 🟡 [ ] Fixed recovery test: wait for both old PIDs to die, cold-launch a cleared task, reject stale Activity warning and require fresh UI+engine PIDs with HTTP health. 28/28 local contracts PASS; awaiting CI emulator validation.
- ⬜ [ ] ARM64 physical device installs and runs chat/runtime tests (**NOT TESTED**).

## CP17 Personal release
- ⬜ [ ] Personal APK, source ZIP, SBOM/licenses, no credentials and clean history.

## CP18 V1 feature parity • PARTIAL
- ✅ [x] 26 social feature items inventoried: checkpoints/CP18/PARITY_MATRIX.md.
- ✅ [x] 15 source symbols protected by scripts/qa/team-http.test.js contract.
- ✅ [x] Original web/app.js, web/index.html, MainActivity.kt checksums unchanged at first checkpoint.
- ⬜ [ ] Golden screenshot and interactive Android regression across 26 items.

## CP19 Zovia persona and rooms • PARTIAL
- ✅ [x] Architect persona in personas/zovia/PERSONA.md.
- ✅ [x] Four-person registry + stable legacy room names in agent/team-registry.js.
- ✅ [x] Room deny rules and migration helpers, unit tests.
- ✅ [x] GET /api/team metadata-only and 409 for unsupported direct_zovia messages.
- ✅ [x] Separate private room store with file permissions, idempotency, atomic replace.
- ✅ [x] Dedicated private-room-store.test.js tests prove restart, deny, tamper and symlink handling.
- ⬜ [ ] Authenticated per-room live endpoint and fully integrated storage.
- ⬜ [ ] Real Zovia engine, chat UI and mobile device E2E.

## CP20 Structured agent actions • PARTIAL
- ✅ [x] Validated pending mention/delegate/share action schema and in-memory idempotency in agent/action-protocol.js.
- ✅ [x] Reject cross-room mention/delegation and block share for future owner consent; scripts/qa/action-protocol.test.js.
- ⬜ [ ] Persist actions in durable journal and emit trusted execution receipt (not a fake success).
- ⬜ [ ] Real event receipt proves action executed, no simulated done.
- ⬜ [ ] Owner approval for cross-room sharing and safe retry.

## CP21 Selective context
- ⬜ [ ] Principal-scoped ContextPack, signed share receipts, revoke.
- ⬜ [ ] Private chat content never enters another room implicitly.

## CP22 Status/media/voice parity
- ⬜ [ ] Status 24h, native media, quotes, voice and golden snapshots.

## CP23 Multiagent & evidence
- ⬜ [ ] 3-agent isolated worktrees, no racing writes, evidence-gated claims.

## CP24 Final QA and release
- ⬜ [ ] P0 tests, corrected unsupported E2EE claim, personal APK and safe migration.

## Last verified status
- Local baseline tests: **26/26 PASS**.
- Latest run **37878367182**: CI Desktop, Android ARM64/x86_64 lint/assemble+16 KiB ZIP alignment, Android API 36 emulator x86_64 app launch/embedded Node HTTP health **PASS**. Evidence: checkpoints/CP16/RUNTIME_PASS_37878367182.md.
- CP16 remains **PARTIAL** pending physical ARM64 device tests and full application feature parity/long-running runtime QA.
- Zovia execution and Antigravity: NOT CONNECTED.
- User privacy: legacy API still returns all old chats to local client; must introduce auth before exposing new private room.
