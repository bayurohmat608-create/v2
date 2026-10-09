# Checkpoint Index

Start here: [Master Blueprint](../docs/BLUEPRINT_MASTER_V2.md), [Living Checkpoint Tracker](../docs/CHECKPOINT_TRACKER.md), [Latest Session Handoff](../docs/SESSION_HANDOFF.md).

| Checkpoint | Source of evidence | Current gate |
|---|---|---|
| CP00 | [Baseline SHA](CP00/BASELINE_SHA.txt), [Source hashes](CP00/SOURCE_HASHES.sha256) | 🟡 Baseline pinned, Android build not done |
| CP01–CP15, CP17 | [Tracker](../docs/CHECKPOINT_TRACKER.md) | ⬜/🟡 Partially implemented; PTY prototype is separate |
| CP16 | [Android runtime PASS](CP16/RUNTIME_PASS_37878367182.md), [Cold restart PASS](CP16/RESTART_PASS_37887912549.md), [Handoff](CP16/HANDOFF.md) | 🟡 CI emulator startup/restart Node HTTP PASS; physical ARM64 pending |
| CP18 | [Parity matrix](CP18/PARITY_MATRIX.md) | 🟡 Inventory & static checks |
| CP19 | [CP19 report](CP19/HANDOFF.md) | 🟡 Zovia registry + private room module; live chat not ready |
| CP20 | [CP20 report](CP20/HANDOFF.md) | 🟡 Pending action contract; real dispatcher not ready |
| CP21–CP24 | [Tracker](../docs/CHECKPOINT_TRACKER.md) | ⬜ Not implemented |

**Rule:** A checkpoint's partial subtasks can carry ✅, but full CP acceptance requires device/API evidence and all relevant tests.
