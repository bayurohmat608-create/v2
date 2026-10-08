"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {mkdtempSync,mkdirSync,writeFileSync,chmodSync,readFileSync,rmSync}=require("node:fs");
const {tmpdir}=require("node:os");
const {join,resolve}=require("node:path");
const {spawnSync}=require("node:child_process");

const root=resolve(__dirname,"../..");
const ci=readFileSync(join(root,".github/workflows/ci.yml"),"utf8");
const smoke=join(root,"scripts/qa/android-emulator-smoke.sh");

test("CP16 runner invokes exactly one Bash script, maintaining shell state",()=>{
  const anchor=ci.slice(ci.indexOf("name: Boot Android 36 and verify embedded backend"));
  assert.match(anchor,/^\s*script: bash scripts\/qa\/android-emulator-smoke\.sh\s*$/m);
  assert.doesNotMatch(anchor,/^\s*script: \|/m);
  assert.match(readFileSync(smoke,"utf8"),/^set -Eeuo pipefail$/m);
  const check=spawnSync("bash",["-n",smoke],{encoding:"utf8",timeout:3000});
  assert.equal(check.status,0,check.stderr);
});

function mockHarness(t, apk=true, healthy=true) {
  const temp=mkdtempSync(join(tmpdir(),"v2-cp16-smoke-"));
  t.after(()=>rmSync(temp,{recursive:true,force:true}));
  const bin=join(temp,"bin");
  mkdirSync(bin);
  mkdirSync(join(temp,"runtime-apk"));
  if(apk)writeFileSync(join(temp,"runtime-apk","app-debug.apk"),"nonempty APK stub");
  const fakeAdb=join(bin,"adb");
  writeFileSync(fakeAdb, "#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"$MOCK_ADB_LOG\"\nexit 0\n");
  chmodSync(fakeAdb,0o755);
  const fakeCurl=join(bin,"curl");
  writeFileSync(fakeCurl,healthy?
    "#!/bin/sh\ncase \"$*\" in *'/api/status'*) printf '{\"status\":\"ok\"}';; *) printf 'ok';; esac\n":
    "#!/bin/sh\nexit 22\n");
  chmodSync(fakeCurl,0o755);
  return {temp,run:()=>spawnSync("bash",[smoke],{
    cwd:temp,encoding:"utf8",timeout:10000,
    env:{...process.env,PATH:bin+":"+process.env.PATH,MOCK_ADB_LOG:join(temp,"adb.log"),SMOKE_ATTEMPTS:"2",SMOKE_WAIT_SECONDS:"0"}
  })};
}

test("CP16 emulator script actually installs, starts and probes backend",t=>{
  const h=mockHarness(t);
  const r=h.run();
  assert.equal(r.status,0,(r.stderr||"")+r.stdout);
  assert.match(r.stdout,/CP16_EMULATOR_RUNTIME_SMOKE_PASS/);
  assert.match(readFileSync(join(h.temp,"adb.log"),"utf8"),/install -r runtime-apk\/app-debug\.apk/);
  assert.match(readFileSync(join(h.temp,"adb.log"),"utf8"),/am start -W -n com\.bossbayu\.aiteam\/\.MainActivity/);
  assert.equal(JSON.parse(readFileSync(join(h.temp,"runtime-status.json"),"utf8")).status,"ok");
});

test("CP16 smoke fails closed for missing APK and unhealthy runtime",t=>{
  const missing=mockHarness(t,false);
  assert.equal(missing.run().status,20);
  const unhealthy=mockHarness(t,true,false);
  const result=unhealthy.run();
  assert.equal(result.status,22,result.stderr);
  assert.match(readFileSync(join(unhealthy.temp,"adb.log"),"utf8"),/logcat -d -t 900/);
});
