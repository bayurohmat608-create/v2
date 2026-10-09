# CP16 clean native PRoot candidate (2026-10-09)

## Reason and isolation
The old PRoot binary exits 139 even with `--help` on Android 36 x86_64 (CI 37911832910); the main app/Node and both Android builds pass. The old executable's PT_GNU_RELRO does not end on a 16 KiB page boundary. This is a known incompatibility on 16 KiB page-size devices, but does not by itself prove why the old binary crashes in the current emulator.

This candidate is a separately named **QA-only sidecar** `libproot_candidate.so` in the x86_64 APK. Production `libproot_exec.so`, ARM64, and the runtime manager are unchanged. The CI's native smoke script selects the candidate if present and must pass both `--help` and a real guest command.

## Verified source and inputs
- Upstream Termux PRoot `5.1.107.96`, tag Git SHA `a179d3e8a4e045aaa1fb8cc3284f23509d96d353`.
- Official upstream source **ZIP** SHA-256 `75f654fe60dea92dabff2bf083ae8bfe4f91baa6a1a374786a6bf391015eebaa` verified against project's existing provenance. GitHub generated tar.gz has a different container digest; use ZIP to reproduce the provenance check.
- talloc `2.5.0` upstream source SHA-256 `912afa237510ae542a7733998eb18a12bcda35ab6729c8e2ddb43e8d0ebab007` verified.
- libandroid-shmem `0.7` upstream source SHA-256 `1e5ff8459bc0a8c229dd8a94b27d119987e09ef3414331c2b5ebfff20b98e867` verified.
- Android NDK `27.0.12077973`, x86_64-linux-android26-clang.
- Two isolated upstream C header corrections: add `<strings.h>` to `tracee/tracee.c` and `<string.h>` to `extension/ashmem_memfd/ashmem_memfd.c`; include the verified Termux libandroid-shmem `shm.h` as `sys/shm.h`.
- Clean source build uses `PROOT_WITH_LIBANDROID_SHMEM=true`, app-private `PROOT_UNBUNDLE_LOADER`, with native dependencies `libtalloc_v2.so` and `libandroid-shmem.so` linked **by their original names** (without post-link ELF rewriting), plus `-z max-page-size=16384` and `-z common-page-size=16384`.
- Candidate binary SHA-256 `afa7261904e9c539487e13e3a37a550d593a77f9b97e30d4933b4628a8e4015f`. 16 KiB LOAD and GNU_RELRO preflight: PASS.
- Upstream PRoot licensing is GPL-2.0 and must remain honored, including source/notice obligations.

## Not yet verified
- CI emulator candidate `--help` and actual PRoot `/bin/sh` command: **PENDING**.
- Physical ARM64, long-lived PTY, chat persistence, AI agents, and app release-readiness: **NOT TESTED**.
- PR stays draft. Do not merge/ship QA sidecar as a production runtime.
