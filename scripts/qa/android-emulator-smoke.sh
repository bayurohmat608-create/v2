#!/usr/bin/env bash
set -Eeuo pipefail
LOG_PID=""
diagnostics() {
  local rc="$?"
  trap - EXIT
  adb shell pidof com.bossbayu.aiteam || true
  adb shell pidof com.bossbayu.aiteam:engine || true
  adb shell dumpsys activity activities >runtime-activities.txt 2>&1 || true
  adb shell dumpsys activity services com.bossbayu.aiteam >runtime-services.txt 2>&1 || true
  adb shell dumpsys package com.bossbayu.aiteam >runtime-package.txt 2>&1 || true
  if [ -n "$LOG_PID" ]; then kill "$LOG_PID" 2>/dev/null || true; wait "$LOG_PID" 2>/dev/null || true; fi
  if [ "$rc" -ne 0 ]; then
    echo "CP16_RUNTIME_FAILURE=$rc"
    grep -Ein 'bossbayu|aiteam|AndroidRuntime|FATAL EXCEPTION|ANR in com.bossbayu|UnsatisfiedLinkError|dlopen failed|libnode|proot|Process.*died|Start proc' runtime-logcat.txt | tail -n 130 || true
  fi
  exit "$rc"
}
trap diagnostics EXIT
APK="$(find runtime-apk -type f -name '*.apk' -print -quit)"
test -n "$APK" && test -s "$APK" || { echo "APK missing"; exit 20; }
echo "INSTALL_START=$(date -u +%FT%TZ)"
adb install -r "$APK"
adb shell pm grant com.bossbayu.aiteam android.permission.POST_NOTIFICATIONS || true
adb logcat -c
adb logcat -v threadtime >runtime-logcat.txt 2>&1 &
LOG_PID="$!"
echo "APP_LAUNCH_START=$(date -u +%FT%TZ)"
adb shell am force-stop com.bossbayu.aiteam || true
# am start -W may itself time out on software-only x86 emulation.
adb shell am start -n com.bossbayu.aiteam/.MainActivity || true
adb forward tcp:33000 tcp:3000
attempts="$(printenv SMOKE_ATTEMPTS || echo 90)"
wait_seconds="$(printenv SMOKE_WAIT_SECONDS || echo 2)"
if ! [[ "$attempts" =~ ^[1-9][0-9]*$ ]] || ((attempts > 180)); then echo "Invalid SMOKE_ATTEMPTS" >&2; exit 21; fi
ready=0
for ((i=1;i<=attempts;i++)); do
  if curl -fsS --max-time 3 http://127.0.0.1:33000/api/status >runtime-status.json 2>/dev/null; then
    ready=1
    echo "CP16_HEALTHY_ATTEMPT=$i"
    break
  fi
  if ((i % 10 == 0)); then
    echo "CP16_WAIT_ATTEMPT=$i $(date -u +%FT%TZ)"
    adb shell pidof com.bossbayu.aiteam || true
    adb shell pidof com.bossbayu.aiteam:engine || true
  fi
  sleep "$wait_seconds"
done
if [ "$ready" -ne 1 ]; then
  echo "CP16_BACKEND_UNAVAILABLE"
  exit 22
fi
test -s runtime-status.json
curl -fsS --max-time 5 http://127.0.0.1:33000/ >/dev/null
echo "CP16_EMULATOR_RUNTIME_SMOKE_PASS"
# Repeated launch must re-create the dedicated :engine process and backend.
# This is a read-only recovery gate: no chat messages, credentials or files are modified.
echo "CP16_RESTART_BEGIN=$(date -u +%FT%TZ)"
adb shell am force-stop com.bossbayu.aiteam
adb shell am start -n com.bossbayu.aiteam/.MainActivity
restarted=0
for ((i=1;i<=attempts;i++)); do
  if curl -fsS --max-time 3 http://127.0.0.1:33000/api/status >runtime-restart-status.json 2>/dev/null; then
    restarted=1
    echo "CP16_RESTART_HEALTHY_ATTEMPT=$i"
    break
  fi
  sleep "$wait_seconds"
done
if [ "$restarted" -ne 1 ]; then
  echo "CP16_RESTART_BACKEND_UNAVAILABLE"
  exit 23
fi
test -s runtime-restart-status.json
curl -fsS --max-time 5 http://127.0.0.1:33000/api/team >runtime-team.json
python3 - <<'PY'
import json
from pathlib import Path
first=json.loads(Path("runtime-status.json").read_text())
second=json.loads(Path("runtime-restart-status.json").read_text())
team=json.loads(Path("runtime-team.json").read_text())
assert isinstance(first,dict) and isinstance(second,dict), "status must be JSON objects"
assert "availableModels" in first and "availableModels" in second, "invalid backend status"
assert isinstance(team.get("members"),list), "team members missing"
assert {m.get("id") for m in team["members"]} >= {"owner","zovia","budi","rian"}, "team registry incomplete"
assert team.get("chatAgentExecution") == "not-enabled", "do not simulate enabled agents"
print("CP16_RESTART_JSON_CONTRACT_PASS")
PY
echo "CP16_RESTART_RUNTIME_SMOKE_PASS"
