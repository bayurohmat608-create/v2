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
- APK Gradle build, SDK verification, emulator and physical device tests.
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
