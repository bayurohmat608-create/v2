# CP16 Android 36 restart failure and remediation (2026-10-09)

## Failure evidence
- CI run: https://github.com/bayurohmat608-create/v2/actions/runs/37885599280
- Desktop verification, Android ARM64 and x86_64 compilation and APK alignment: PASS.
- Initial Android emulator startup: `CP16_HEALTHY_ATTEMPT=3`, `CP16_EMULATOR_RUNTIME_SMOKE_PASS`.
- Restart gate then failed after 90 HTTP probes: `CP16_RESTART_BACKEND_UNAVAILABLE`; the Bash script intentionally exited **23**. Exit 23 is a health-check failure, not the Android application exit code.
- Logcat at 04:53:15.492–15.495 UTC showed the `am force-stop` killing BOTH app UI PID 2448 and engine PID 2581. Immediate `am start` returned Android result code 3, with warning: 'Activity not started, intent has been delivered to currently running top-most instance.' No replacement app process was started in the recorded interval.
- Source evidence: GitHub Actions failed-job log and uploaded `android-runtime-smoke-evidence` artifacts. Findings indicate a restart test-task race; they do not prove an application crash.

## Corrective gate (pending fresh emulator confirmation)
- After force-stop, poll until **both** app processes have exited.
- Pause briefly to allow Activity/task transition to settle.
- Relaunch using `am start -S -f 0x10008000` and reject a stale-task warning.
- Require a subsequent HTTP `/api/status` response AND fresh app + engine PIDs (both different from initial).
- Preserve deterministic negative tests for stale-task warning and unchanged PIDs.
- Local `npm run qa:baseline`: **28/28 PASS** before CI run.

## Boundaries
- This is test harness hardening, not evidence that real AI-agent chat or PRoot/terminal features work.
- No UI modification. `main` unchanged. PR #1 remains draft. Physical ARM64 device tests are pending.


## Follow-up CI flag correction (run 37887122479)
- Source branch commit `49e3626` CI build jobs passed; the emulator restart gate failed with script exit 26 **before relaunch**.
- Android 36 ADB parser explicitly reported `java.lang.IllegalArgumentException: Unknown option: --activity-new-task`. This was a test-harness flag error, not app crash.
- Replaced the unsupported named option with the supported `am start -S -f 0x10008000 -n ...`, where `0x10000000` = NEW_TASK and `0x00008000` = CLEAR_TASK.
- Awaiting fresh emulator validation. Do not mark recovery as verified based on local tests.

## CI runtime preflight interruption (run 37887560726)
- Desktop, ARM64 and x86_64 compile jobs: **PASS**.
- The runtime emulator did **not** start. Preflight KVM permission check failed: `KVM exists but remains inaccessible`.
- CI now falls back to `sudo chmod 0666 /dev/kvm` on its ephemeral GitHub runner after udev trigger, then checks readability/writability in a bounded retry loop. This affects the runner only, not Android app or user devices.
- Emulator restart recovery gate remains unverified until a later full run.
