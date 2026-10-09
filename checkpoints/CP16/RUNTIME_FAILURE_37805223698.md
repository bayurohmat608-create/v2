# CI runtime diagnosis 37805223698

- Desktop, ARM64 debug build, x86_64 debug build: PASS.
- x86_64 Android 36 software-emulated boot: PASS, but slow and without KVM.
- APK was actually installed: `Success`. MainActivity launch returned `Status: timeout` after 20 seconds.
- Forwarded TCP port 3000 did not yield `/api/status`: 90 attempts, curl `(52) Empty reply from server`; adbd reported `Connection refused` to port 3000. CI exit code 22 comes from smoke script, not necessarily app process exit.
- Captured runtime-logcat.txt only at time of timeout; it contains Bluetooth/phone process crashes, but no proven app-specific fatal. Do not attribute system crashes to app without matching package PID.
- Next change: start continuous logcat immediately before Activity launch; collect PID, dumpsys activity/services/package on failure, keep logs as CI artifact. Remove `am start -W` blocking wait under slow software emulator. No Android app source changes.
- Source run: https://github.com/bayurohmat608-create/v2/actions/runs/37805223698
- Acceptance pending: actual `/api/status` response, no app crash, real-device QA.
