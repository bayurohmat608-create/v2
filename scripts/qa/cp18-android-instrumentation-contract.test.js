"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {join,resolve}=require("node:path");
const root=resolve(__dirname,"../..");
const source=readFileSync(join(root,"android/app/src/androidTest/java/com/bossbayu/aiteam/runtime/PRootRuntimeInstrumentedTest.kt"),"utf8");
const ci=readFileSync(join(root,".github/workflows/ci.yml"),"utf8");
const smoke=readFileSync(join(root,"scripts/qa/android-emulator-smoke.sh"),"utf8");
test("CP18 deploys actual instrumentation APK and fails closed on missing test success",()=>{
  assert.match(readFileSync(join(root,"android/app/build.gradle.kts"),"utf8"),/androidTestImplementation/);
  assert.match(smoke,/runtime-test-apk/);
  assert.match(smoke,/CP18_INSTRUMENTATION_TEST:-0/);
  assert.match(smoke,/adb install -r "\$test_apk"/);
  assert.match(smoke,/am instrument -w -r/);
  assert.match(smoke,/OK \(2 tests\)/);
  assert.match(smoke,/CP18_INSTRUMENTATION_FAILURE/);
});
test("CP18 read-only Android app-UID integration tests exercise the real launcher and shell pipes",()=>{
  assert.match(source,/class PRootRuntimeInstrumentedTest/);
  assert.match(source,/proot\.execute\(/);
  assert.match(source,/session\.start\(\)/);
  assert.match(source,/session\.sendCommand\(/);
  assert.match(source,/session\.close\(\)/);
  assert.match(source,/ready\.await\(25, TimeUnit\.SECONDS\)/);
  assert.doesNotMatch(source,/http:|https:|\/api\/terminal\/exec/);
});
