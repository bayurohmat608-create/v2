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
first_ui_pid="$(adb shell pidof com.bossbayu.aiteam 2>/dev/null || true)"
first_engine_pid="$(adb shell pidof com.bossbayu.aiteam:engine 2>/dev/null || true)"
if [ -z "$first_ui_pid" ] || [ -z "$first_engine_pid" ]; then
  echo "CP16_INITIAL_PROCESSES_MISSING"
  exit 24
fi
echo "CP16_INITIAL_UI_PID=$first_ui_pid"
echo "CP16_INITIAL_ENGINE_PID=$first_engine_pid"
adb shell am force-stop com.bossbayu.aiteam
# Android 36 may still hold the top task record briefly after force-stop.
# Do not deliver the relaunch intent to that dead top Activity.
stopped=0
for ((i=1;i<=20;i++)); do
  old_ui="$(adb shell pidof com.bossbayu.aiteam 2>/dev/null || true)"
  old_engine="$(adb shell pidof com.bossbayu.aiteam:engine 2>/dev/null || true)"
  if [ -z "$old_ui" ] && [ -z "$old_engine" ]; then
    stopped=1
    break
  fi
  sleep 0.5
done
if [ "$stopped" -ne 1 ]; then
  echo "CP16_RESTART_OLD_PROCESSES_STILL_RUNNING"
  exit 25
fi
# Release Android's transition/task state, then force fresh task creation.
sleep 1
launch_output="$(adb shell am start -S -f 0x10008000 -n com.bossbayu.aiteam/.MainActivity 2>&1)" || {
  echo "CP16_RESTART_ACTIVITY_LAUNCH_FAILED: $launch_output"
  exit 26
}
echo "$launch_output"
if [[ "$launch_output" == *"Warning: Activity not started"* ]]; then
  echo "CP16_RESTART_STALE_TASK_INTENT"
  exit 26
fi
restarted=0
for ((i=1;i<=attempts;i++)); do
  if curl -fsS --max-time 3 http://127.0.0.1:33000/api/status >runtime-restart-status.json 2>/dev/null; then
    new_ui_pid="$(adb shell pidof com.bossbayu.aiteam 2>/dev/null || true)"
    new_engine_pid="$(adb shell pidof com.bossbayu.aiteam:engine 2>/dev/null || true)"
    if [ -n "$new_ui_pid" ] && [ -n "$new_engine_pid" ] &&
       [ "$new_ui_pid" != "$first_ui_pid" ] && [ "$new_engine_pid" != "$first_engine_pid" ]; then
      restarted=1
      echo "CP16_RESTART_NEW_UI_PID=$new_ui_pid"
      echo "CP16_RESTART_NEW_ENGINE_PID=$new_engine_pid"
      echo "CP16_RESTART_HEALTHY_ATTEMPT=$i"
      break
    fi
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
