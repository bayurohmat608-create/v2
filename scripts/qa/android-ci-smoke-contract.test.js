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
  assert.match(anchor,/^\s*script: CP16_PROOT_TEST=1 bash scripts\/qa\/android-emulator-smoke\.sh\s*$/m);
  assert.doesNotMatch(anchor,/^\s*script: \|/m);
  assert.match(readFileSync(smoke,"utf8"),/^set -Eeuo pipefail$/m);
  const check=spawnSync("bash",["-n",smoke],{encoding:"utf8",timeout:3000});
  assert.equal(check.status,0,check.stderr);
});

function mockHarness(t, apk=true, healthy=true, options={}) {
  const temp=mkdtempSync(join(tmpdir(),"v2-cp16-smoke-"));
  t.after(()=>rmSync(temp,{recursive:true,force:true}));
  const bin=join(temp,"bin");
  mkdirSync(bin);
  mkdirSync(join(temp,"runtime-apk"));
  if(apk)writeFileSync(join(temp,"runtime-apk","app-debug.apk"),"nonempty APK stub");
  const fakeAdb=join(bin,"adb");
  writeFileSync(fakeAdb, String.raw`#!/bin/sh
printf '%s\n' "$*" >> "$MOCK_ADB_LOG"
state="$(cat "$MOCK_ADB_STATE" 2>/dev/null || echo stopped)"
case "$*" in
  "shell am force-stop com.bossbayu.aiteam")
    echo stopped > "$MOCK_ADB_STATE"
    ;;
  "shell am start -n com.bossbayu.aiteam/.MainActivity")
    echo first > "$MOCK_ADB_STATE"
    echo "Starting: Intent"
    ;;
  "shell am start -S -f 0x10008000 -n com.bossbayu.aiteam/.MainActivity")
    if [ "$MOCK_RESTART_WARNING" = 1 ]; then
      echo "Warning: Activity not started, intent has been delivered to currently running top-most instance."
    else
      echo second > "$MOCK_ADB_STATE"
      echo "Starting: Intent"
    fi
    ;;
  "shell pidof com.bossbayu.aiteam")
    if [ "$state" = first ] || { [ "$state" = second ] && [ "$MOCK_SAME_RESTART_PID" = 1 ]; }; then
      echo 101
    elif [ "$state" = second ]; then echo 201
    else exit 1
    fi
    ;;
  "shell pidof com.bossbayu.aiteam:engine")
    if [ "$state" = first ] || { [ "$state" = second ] && [ "$MOCK_SAME_RESTART_PID" = 1 ]; }; then
      echo 102
    elif [ "$state" = second ]; then echo 202
    else exit 1
    fi
    ;;
esac
exit 0
`);
  chmodSync(fakeAdb,0o755);
  const fakeCurl=join(bin,"curl");
  writeFileSync(fakeCurl, healthy ? String.raw`#!/bin/sh
case "$*" in
  *'/api/status'*) printf '{"status":"ok","availableModels":[]}' ;;
  *'/api/team'*) printf '{"members":[{"id":"owner"},{"id":"zovia"},{"id":"budi"},{"id":"rian"}],"chatAgentExecution":"not-enabled"}' ;;
  *'/api/chats'*) printf '{"chats":{"group":[],"direct_budi":[],"direct_rian":[]}}' ;;
  *'/api/workstation/status'*) printf '{"active":"alpine","storage":{"workspaces":{"budi":"/w/budi","rian":"/w/rian"}}}' ;;
  *'/api/terminal/exec'*)
    out=""
    previous=""
    for arg in "$@"; do
      if [ "$previous" = -o ]; then out="$arg"; break; fi
      previous="$arg"
    done
    printf '{"error":"raw terminal execution dinonaktifkan"}' > "$out"
    printf 409 ;;
  *) printf ok ;;
esac
` : "#!/bin/sh\nexit 22\n");
  chmodSync(fakeCurl,0o755);
  return {temp,run:()=>spawnSync("bash",[smoke],{
    cwd:temp,encoding:"utf8",timeout:15000,
    env:{...process.env,PATH:bin+":"+process.env.PATH,MOCK_ADB_LOG:join(temp,"adb.log"),MOCK_ADB_STATE:join(temp,"state"),MOCK_RESTART_WARNING:options.warning?"1":"0",MOCK_SAME_RESTART_PID:options.samePid?"1":"0",SMOKE_ATTEMPTS:"2",SMOKE_WAIT_SECONDS:"0"}
  })};
}

test("CP16 emulator script actually installs, starts and probes backend",t=>{
  const h=mockHarness(t);
  const r=h.run();
  assert.equal(r.status,0,(r.stderr||"")+r.stdout);
  assert.match(r.stdout,/CP16_EMULATOR_RUNTIME_SMOKE_PASS/);
  assert.match(r.stdout,/CP16_RESTART_RUNTIME_SMOKE_PASS/);
  assert.match(r.stdout,/CP16_RESTART_JSON_CONTRACT_PASS/);
  assert.match(r.stdout,/CP16_READONLY_API_SMOKE_PASS/);
  assert.match(r.stdout,/CP16_RESTART_NEW_UI_PID=201/);
  assert.match(r.stdout,/CP16_RESTART_NEW_ENGINE_PID=202/);
  assert.match(readFileSync(join(h.temp,"adb.log"),"utf8"),/install -r runtime-apk\/app-debug\.apk/);
  assert.match(readFileSync(join(h.temp,"adb.log"),"utf8"),/am start -n com\.bossbayu\.aiteam\/\.MainActivity/);
  assert.equal(JSON.parse(readFileSync(join(h.temp,"runtime-status.json"),"utf8")).status,"ok");
  assert.ok(JSON.parse(readFileSync(join(h.temp,"runtime-restart-status.json"),"utf8")).availableModels);
  assert.match(readFileSync(join(h.temp,"adb.log"),"utf8"),/force-stop com\.bossbayu\.aiteam[\s\S]*am start -n com\.bossbayu\.aiteam\/\.MainActivity[\s\S]*force-stop com\.bossbayu\.aiteam/);
  assert.match(readFileSync(join(h.temp,"adb.log"),"utf8"),/am start -S -f 0x10008000 -n com\.bossbayu\.aiteam\/\.MainActivity/);
  assert.doesNotMatch(readFileSync(smoke,"utf8"),/--activity-new-task/);
});

test("CP16 smoke fails closed for missing APK and unhealthy runtime",t=>{
  const missing=mockHarness(t,false);
  assert.equal(missing.run().status,20);
  const unhealthy=mockHarness(t,true,false);
  const result=unhealthy.run();
  assert.equal(result.status,22,result.stderr);
  assert.match(readFileSync(join(unhealthy.temp,"adb.log"),"utf8"),/logcat -v threadtime/);
});


test("CP16 restart rejects Android stale top-task delivery",t=>{
  const h=mockHarness(t,true,true,{warning:true});
  const result=h.run();
  assert.equal(result.status,26,(result.stderr||"")+result.stdout);
  assert.match(result.stdout,/CP16_RESTART_STALE_TASK_INTENT/);
});

test("CP16 restart rejects reused PIDs even if HTTP probe is healthy",t=>{
  const h=mockHarness(t,true,true,{samePid:true});
  const result=h.run();
  assert.equal(result.status,23,(result.stderr||"")+result.stdout);
  assert.match(result.stdout,/CP16_RESTART_BACKEND_UNAVAILABLE/);
});

test("CP16 requires accessible KVM before emulator starts", () => {
  const runtimeJob = ci.slice(ci.indexOf("  android-runtime-smoke:"));
  const kvm = runtimeJob.indexOf("name: Enable KVM for Android emulator");
  const boot = runtimeJob.indexOf("name: Boot Android 36 and verify embedded backend");
  assert.ok(kvm >= 0 && boot > kvm, "KVM must be prepared before emulator boot");
  assert.match(runtimeJob, /if \[ ! -c \/dev\/kvm \]/);
  assert.match(runtimeJob, /if \[ ! -r \/dev\/kvm \] \|\| \[ ! -w \/dev\/kvm \]/);
  assert.match(runtimeJob, /udevadm trigger --name-match=kvm/);
  assert.match(runtimeJob, /sudo chmod 0666 \/dev\/kvm/);
  assert.match(runtimeJob, /for attempt in 1 2 3 4 5/);
});

test("CP16 native PRoot QA is app-UID-only and read-only", () => {
  const probe = readFileSync(join(root, "scripts/qa/android-proot-smoke.sh"), "utf8");
  assert.match(probe, /adb shell -T run-as "\$package" sh/);
  assert.match(probe, /libproot_exec\.so/);
  assert.match(probe, /libproot_loader\.so/);
  assert.match(probe, /LD_LIBRARY_PATH='\$native_dir'/);
  assert.match(probe, /timeout 30s adb shell -T run-as/);
  assert.match(probe, /CP16_PROOT_EXEC_PASS/);
  assert.match(probe, /CP16_PROOT_HELP_PASS/);
  assert.match(probe, /CP16_PROOT_ELF_INIT_SIGSEGV/);
  assert.doesNotMatch(probe, /\badb root\b|\bsu -c\b|\bchmod 777\b/);
  assert.match(readFileSync(smoke, "utf8"), /CP16_PROOT_TEST:-0/);
});


test("CP16 clean PRoot sidecar has authenticated source bytes and safe ELF pages", () => {
  const {createHash} = require("node:crypto");
  const candidate = readFileSync(join(root, "android/app/src/main/jniLibs/x86_64/libproot_candidate.so"));
  assert.equal(createHash("sha256").update(candidate).digest("hex"), "afa7261904e9c539487e13e3a37a550d593a77f9b97e30d4933b4628a8e4015f");
  assert.equal(candidate.subarray(0,4).toString("hex"),"7f454c46");
  assert.equal(candidate.readUInt8(4),2,"ELF must be 64-bit");
  assert.equal(candidate.readUInt8(5),1,"ELF must be little endian");
  assert.equal(candidate.readUInt16LE(18),62,"ELF must target x86_64");
  const offset=Number(candidate.readBigUInt64LE(32));
  const phsize=candidate.readUInt16LE(54);
  const count=candidate.readUInt16LE(56);
  let load=0;
  let relro=0;
  for(let i=0;i<count;i++){
    const start=offset+i*phsize;
    const type=candidate.readUInt32LE(start);
    const address=candidate.readBigUInt64LE(start+16);
    const memory=candidate.readBigUInt64LE(start+40);
    if(type===1){
      load++;
      const alignment=candidate.readBigUInt64LE(start+48);
      assert.ok(alignment>=16384n,"LOAD alignment below 16 KiB");
    }
    if(type===0x6474e552){
      relro++;
      assert.equal((address+memory)%16384n,0n,"GNU_RELRO end is not 16 KiB aligned");
    }
  }
  assert.ok(load>=2,"expected native load segments");
  assert.equal(relro,1,"expected one GNU_RELRO");
  const script=readFileSync(join(root,"scripts/qa/android-proot-smoke.sh"),"utf8");
  assert.match(script,/CP16_PROOT_QA_CANDIDATE_SELECTED/);
  assert.match(script,/libproot_candidate\.so/);
  assert.match(script,/adb shell test -f "\$candidate"/);
  assert.match(script,/CP16_PROOT_QA_CANDIDATE_MISSING_ON_DEVICE/);
});
