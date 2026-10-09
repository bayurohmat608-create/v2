#!/usr/bin/env bash
set -Eeuo pipefail
package=com.bossbayu.aiteam
# Android debug 'run-as' executes as the app UID, not as a privileged/root user.
package_info="$(adb shell dumpsys package "$package" | tr -d '\r')"
native_dir="$(printf '%s\n' "$package_info" | sed -n 's/^[[:space:]]*nativeLibraryDir=//p' | head -1)"
if [ -z "$native_dir" ]; then
  legacy_dir="$(printf '%s\n' "$package_info" | sed -n 's/^[[:space:]]*legacyNativeLibraryDir=//p' | head -1)"
  abi="$(printf '%s\n' "$package_info" | sed -n 's/^[[:space:]]*primaryCpuAbi=//p' | head -1)"
  if [ "$abi" = x86_64 ]; then native_dir="$legacy_dir/x86_64"; fi
fi
if [[ ! "$native_dir" == /data/app/*/lib/x86_64 ]]; then
  echo "CP16_PROOT_NATIVE_LIBRARY_DIR_UNAVAILABLE"
  exit 40
fi
root="/data/user/0/$package/files/workstations/alpine"
bin="$native_dir/libproot_exec.so"
loader="$native_dir/libproot_loader.so"
tmp="/data/user/0/$package/cache/proot-tmp"
# Never execute arbitrary input; fixed read-only shell expression.
guest='printf CP16_PROOT_EXEC_PASS; printf " "; /bin/busybox uname -m'
# Probe ELF dynamic loading independently from ptrace and guest startup.
# This isolates binary initialization failures from Alpine translation failures.
probe_script="LD_LIBRARY_PATH='$native_dir'; export LD_LIBRARY_PATH; '$bin' --help"
set +e
probe_output="$(printf '%s\n' "$probe_script" | timeout 15s adb shell -T run-as "$package" sh 2>&1)"
probe_exit=$?
set -e
echo "CP16_PROOT_HELP_EXIT=$probe_exit"
if [ "$probe_exit" -eq 139 ]; then
  echo "CP16_PROOT_ELF_INIT_SIGSEGV"
  adb logcat -d -b crash -v threadtime >runtime-proot-crash-logcat.txt 2>&1 || true
  exit 44
fi
if [ "$probe_exit" -ne 0 ]; then
  echo "CP16_PROOT_HELP_FAILED"
  printf '%s\n' "$probe_output" | head -c 1800
  exit 45
fi
echo "CP16_PROOT_HELP_PASS"
# Feed a fixed shell program through stdin so ADB command-line quoting
# cannot drop the native executable argument.
read -r -d '' guest_script <<EOF || true
PROOT_LOADER='$loader'
PROOT_TMP_DIR='$tmp'
TMPDIR='$tmp'
LD_LIBRARY_PATH='$native_dir'
export PROOT_LOADER PROOT_TMP_DIR TMPDIR LD_LIBRARY_PATH
echo CP16_PROOT_RUNAS_STDIN_READY
id
ls -l '$bin' '$loader' '$root/bin/busybox' || exit 43
echo CP16_PROOT_BINARY_FOUND
exec '$bin' -v 9 -0 -r '$root' -b /dev -b /proc -w / /bin/sh -c '$guest'
EOF
set +e
result="$(printf '%s\n' "$guest_script" | timeout 30s adb shell -T run-as "$package" sh 2>&1)"
native_exit=$?
set -e
if [ "$native_exit" -ne 0 ]; then
  echo "CP16_PROOT_NATIVE_EXIT=$native_exit"
  echo "CP16_PROOT_NATIVE_EXEC_FAILED"
  # Capture native crash buffer independently of ordinary app logcat.
  # Android tombstone and debuggerd lines may be emitted only here.
  adb logcat -d -b crash -v threadtime >runtime-proot-crash-logcat.txt 2>&1 || true
  if [[ "$result" != *CP16_PROOT_RUNAS_STDIN_READY* ]]; then
    echo "CP16_PROOT_STDIN_NOT_CONFIRMED"
  fi
  echo "$result"
  exit 41
fi
echo "$result"
if [[ "$result" != *CP16_PROOT_EXEC_PASS* ]] || [[ "$result" != *x86_64* ]]; then
  echo "CP16_PROOT_NATIVE_OUTPUT_INVALID"
  exit 42
fi
echo "CP16_PROOT_READONLY_SMOKE_PASS"
