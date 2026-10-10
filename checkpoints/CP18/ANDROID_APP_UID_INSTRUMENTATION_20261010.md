# CP18 Android app-UID instrumentation foundation

Date: 2026-10-10. Feature branch only; PR #1 remains draft.

## Implemented
- AndroidX AndroidJUnit4 instrumentation APK with two read-only tests:
  1. Call real PRootManager.execute() under target app context with a fixed Alpine marker.
  2. Open real pipe-backed TerminalSession; wait for shell startup output; send a fixed marker; close the session.
- Explicit timeouts, on-device test output capture and fail-closed verification harness in scripts/qa/android-emulator-smoke.sh, behind CP18_INSTRUMENTATION_TEST=1; default historical CP16 CI untouched.
- No exposed HTTP command execution or UI layout changes. Runtime ARM64 binary and main remain untouched.

## Verified now
- Local Node/Javascript contract tests: 38/38 PASS.
- Android x86_64 test APK compilation **PASS** in Sprite using JDK 17, Android 36 SDK, Gradle 8.13 and `./gradlew -PruntimeAbi=x86_64 assembleDebugAndroidTest`, after installing licensed Android Build-Tools 35 locally.
- New APK path: android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk.
- Commit code separately from workflow; GitHub OAuth refused modifying .github/workflows/ci.yml without workflow scope.
- Existing CI only tests application smoke; **new instrumented methods have NOT RUN in Android emulator** and cannot be marked passed.

## Next verification gate
- Run locally on Android 36 x86_64 emulator: install both debug APK and androidTest APK, execute `adb shell am instrument -w -r -e class com.bossbayu.aiteam.runtime.PRootRuntimeInstrumentedTest com.bossbayu.aiteam.test/androidx.test.runner.AndroidJUnitRunner`. Require `OK (2 tests)`, no failures and cleanup.
- Alternatively, authorized maintainer adds instrumented APK build, download and emulator invocation to .github/workflows/ci.yml (workflow-scoped credentials required). No bypass.
- Preserve draft PR #1; physical ARM64 PRoot, production PTY and agent execution unverified.
