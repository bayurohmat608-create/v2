#!/usr/bin/env bash
# Build admission helper for the isolated V2 Sprite. No source UI modification.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOLS="${V2_ANDROID_TOOLCHAIN:-/home/sprite/v2-build-toolchain-1008}"
export JAVA_HOME="${JAVA_HOME:-$TOOLS/jdk17}"
export ANDROID_HOME="${ANDROID_HOME:-$TOOLS/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$TOOLS/gradle-home}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
for must in "$JAVA_HOME/bin/java" "$ANDROID_SDK_ROOT/platforms/android-36/android.jar" "$ANDROID_SDK_ROOT/build-tools/36.0.0/aapt2" "$ANDROID_SDK_ROOT/ndk/27.0.12077973/ndk-build" "$ANDROID_SDK_ROOT/cmake/3.22.1/bin/cmake"; do
    if ! test -e "$must"; then echo "BUILD_BLOCKED missing:$must" >&2; exit 43; fi
done
mkdir -p "$REPO/checkpoints/CP16"
LOG="$REPO/checkpoints/CP16/android-debug-build.log"
echo "BUILD_START $(date -u +%FT%TZ)" | tee "$LOG"
echo "JAVA=$("$JAVA_HOME/bin/java" -version 2>&1 | head -n1)" | tee -a "$LOG"
set +e
(
  cd "$REPO/android"
  ./gradlew --no-daemon --max-workers=2 -Dorg.gradle.jvmargs=-Xmx3g lintDebug assembleDebug --stacktrace
) >>"$LOG" 2>&1
EXIT_CODE=$?
set -e
echo "BUILD_EXIT=$EXIT_CODE" | tee -a "$LOG"
if [ "$EXIT_CODE" -ne 0 ]; then
    tail -n 90 "$LOG"
    exit "$EXIT_CODE"
fi
APK="$REPO/android/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"
sha256sum "$APK" | tee "$REPO/checkpoints/CP16/APK_SHA256.txt"
ls -lh "$APK"
