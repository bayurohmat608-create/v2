# CP16 PRoot native crash investigation (2026-10-09)

## Observed facts
- Run: https://github.com/bayurohmat608-create/v2/actions/runs/37894231576
- Desktop, ARM64 and x86_64 build, Node first boot/restart, read-only API: passed.
- app UID run-as and native executable/loader/Alpine BusyBox existence: passed.
- Native PRoot invocation: exit 139, no guest shell output.
- GitHub artifact `runtime-proot-crash-logcat.txt` was empty (0 bytes). No actionable tombstone/backtrace found in that artifact.
- Adding `LD_LIBRARY_PATH` to match the application launcher did not resolve the crash.
- Exit 139 suggests SIGSEGV, but location/cause remain unknown; no claim that a specific ELF or library caused it.

## Next diagnostic
Before invoking PRoot with Alpine arguments, run `libproot_exec.so --help` through the same debug app UID, native dependency path, and 15-second timeout. A help probe that fails with 139 indicates binary initialization crashes without guest translation; a passing probe means translation/ptrace path still needs investigation. Keep the native test fail-closed, never skip it to force green CI.

## Unverified
PRoot command execution, physical ARM64 native runtime, PTY, actual agent execution, persistent chat storage after restart.
