#!/usr/bin/env bash
# CP16: use one Bash process because android-emulator-runner invokes each
# script line independently as sh -c and otherwise loses shell variables.
set -Eeuo pipefail

capture_failure() {
  local rc="$?"
  if [ "$rc" -ne 0 ]; then
    printf '%s\n' "Android runtime smoke failed (exit $rc); collecting diagnostics" >&2
    adb logcat -d -t 900 >runtime-logcat.txt 2>&1 || true
    adb shell dumpsys activity services com.bossbayu.aiteam >&2 || true
    tail -n 200 runtime-logcat.txt >&2 || true
  fi
}
trap capture_failure EXIT

APK="$(find runtime-apk -type f -name '*.apk' -print -quit)"
if [ -z "$APK" ] || [ ! -s "$APK" ]; then
  echo "Missing nonempty downloaded x86_64 debug APK under runtime-apk" >&2
  exit 20
fi
echo "Installing: $APK"
adb install -r "$APK"
adb shell pm grant com.bossbayu.aiteam android.permission.POST_NOTIFICATIONS || true
adb logcat -c
adb shell am force-stop com.bossbayu.aiteam || true
adb shell am start -W -n com.bossbayu.aiteam/.MainActivity
adb forward tcp:33000 tcp:3000

attempts="$(printenv SMOKE_ATTEMPTS || echo 90)"
wait_seconds="$(printenv SMOKE_WAIT_SECONDS || echo 2)"
if ! [[ "$attempts" =~ ^[1-9][0-9]*$ ]] || [ "$attempts" -gt 180 ]; then
  echo "Invalid SMOKE_ATTEMPTS" >&2
  exit 21
fi

ready=0
for ((i=1; i<=attempts; i++)); do
  if curl -fsS --max-time 3 http://127.0.0.1:33000/api/status >runtime-status.json; then
    ready=1
    echo "Backend healthy on attempt $i"
    break
  fi
  sleep "$wait_seconds"
done

if [ "$ready" -ne 1 ]; then
  echo "Embedded backend unavailable after $attempts attempts" >&2
  exit 22
fi

test -s runtime-status.json
cat runtime-status.json
curl -fsS --max-time 5 http://127.0.0.1:33000/ >/dev/null
adb shell pidof com.bossbayu.aiteam || true
adb shell pidof com.bossbayu.aiteam:engine || true
adb logcat -d -t 900 >runtime-logcat.txt || true
echo "CP16_EMULATOR_RUNTIME_SMOKE_PASS"
