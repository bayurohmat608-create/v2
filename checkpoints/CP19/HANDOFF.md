# CP00 / CP18 / CP19: First implementation checkpoint

Date: 2026-10-08
Owner: Mas Bay
Reference: WhatsApp Agent V2 Master Blueprint v2.0
Base revision: `d3f74a4776d43acfa22f4a3ea2a73c7809d833dc`

## Scope and files
- `checkpoints/CP00/BASELINE_SHA.txt`, `SOURCE_HASHES.sha256`: baseline provenance.
- `checkpoints/CP18/PARITY_MATRIX.md`: 26-item V1 social capability checklist.
- `personas/zovia/PERSONA.md`: third-agent role contract.
- `agent/team-registry.js`: immutable roster, chat room metadata, migration helpers, and authorization helpers.
- `server.js`: read-only `GET /api/team`; reject unsupported `direct_zovia` messages with HTTP 409.
- `scripts/qa/*.test.js`: isolated HTTP and unit regression tests.
- `package.json`: repeatable `npm run qa:baseline` and `npm run test:contracts`.

No redesign of WhatsApp chat. No alteration of native Droide or other Sprite projects.
All changes live on a separate V2 worktree branch; nothing was pushed to GitHub.

## Proven status
- Node syntax checks: PASS.
- Unit + HTTP integration tests: 7/7 PASS.
- Original web/app.js, web/index.html and Android MainActivity checksums: unchanged from baseline.
- Git whitespace audit: PASS.
- Android SDK 34, JDK17 build: BLOCKED in this isolated environment (only Java 25 found).
- `assembleDebug`, `lintDebug`, emulator and actual device tests: NOT TESTED.
- Original full `npm test` engine smoke: NOT RUN. It depends on externally provisioned CLI executables.
- Zovia live chat, task scheduler, three-engine execution, UI parity on physical device: NOT YET IMPLEMENTED.

## Explicit privacy boundary
The legacy V2 `/api/chats` still exposes all existing Budi/Rian conversations to the local UI client. It is not an authenticated per-room API and must be replaced before exposing new private Zovia messages. This checkpoint only adds read-only metadata; the new room is reserved, not published to existing chat clients. Cross-room authorization helpers currently protect calls to those helpers, not all legacy backend routes.

## Next engineering sequence
1. CP19 continuation: transactional per-room store, authenticated principal/room API, migration to `direct_zovia` with original V1 history untouched.
2. CP19 continuation: Zovia chat display using agreed WhatsApp V1 visual, real agent model selection and job receipts.
3. CP20: structured agent actions/mentions with auditable execution receipts.
4. CP01-CP03: toolchain setup and device-level Node/PRoot/PTY/supervisor tests using Droide dependencies.
5. Then additional 25-checkpoint roadmap gates including model discovery and optional Antigravity policy+compatibility verification.

## Risk control and rollback
- The old GitHub `main` and original V2 worktree are untouched.
- The branch can be removed without editing the original Android source or V1 chat history.
- A new job or chat request to `direct_zovia` returns `AGENT_NOT_READY` and does not mutate stored history.
- Do not ship `/api/team` metadata as evidence of an active Zovia engine.

## CP19 continuation: private room
- ✅ [x] Added agent/private-room-store.js (restricted owner/Zovia, 0600 file, 0700 parent, atomic stage/replace, idempotent IDs).
- ✅ [x] scripts/qa/private-room-store.test.js covers persistence after restart, denial, tamper/symlink and bounds.
- ⬜ [ ] Not yet exposed via authenticated live HTTP/SSE endpoints. Zovia chat requests remain HTTP 409.
- ⬜ [ ] Actual Zovia engine and WhatsApp UI integration not yet implemented.
- Active branch for this continuation is feature/v2-blueprint-tracker-cp19-cp20-20261008, with isolated worktree /home/sprite/v2-checkpoints-20261008.
