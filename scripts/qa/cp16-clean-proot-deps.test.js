"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {join,resolve} = require("node:path");
const {spawnSync} = require("node:child_process");
const {createHash} = require("node:crypto");
const root=resolve(__dirname,"../..");
const lib=join(root,"android/app/src/main/jniLibs/x86_64");
const sha=p=>createHash("sha256").update(readFileSync(p)).digest("hex");
function elf(tool,args) {
  const r=spawnSync(tool,args,{encoding:"utf8",timeout:4000});
  assert.equal(r.status,0,r.stderr||r.error?.message);
  return r.stdout;
}
test("CP16 QA candidate links only to its clean private talloc with required exports",()=>{
  const candidate=join(lib,"libproot_candidate.so");
  const talloc=join(lib,"libtalloc_candidate.so");
  assert.equal(sha(candidate),"0db2f9ee88cc19894029ad33d12d18d92f582884696c7ddd8ddf9f1b59c16601");
  assert.equal(sha(talloc),"79ab103b2b719dbf058c43b5c067cadbb78c6d5511627d97ce9eeebc1ab288e7");
  const deps=elf("readelf",["-d",candidate]);
  assert.match(deps,/Shared library: \[libtalloc_candidate\.so\]/);
  assert.doesNotMatch(deps,/Shared library: \[libtalloc_v2\.so\]/);
  assert.match(deps,/Shared library: \[libandroid-shmem\.so\]/);
  assert.match(elf("readelf",["-d",talloc]),/Library soname: \[libtalloc_candidate\.so\]/);
  const symbols=elf("nm",["-D",talloc]);
  assert.match(symbols,/\bT talloc_enable_leak_report\b/);
  assert.doesNotMatch(symbols,/\bU rep_/,"do not rely on unavailable Samba replacement shims");
  for (const file of [candidate,talloc]) {
    assert.match(elf("file",[file]),/ELF 64-bit LSB/);
    const programHeaders=elf("readelf",["-W","-l",file]);
    const load=programHeaders.split("\n").filter(line=>/^\s*LOAD\s/.test(line));
    assert.ok(load.length>=2,"ELF requires multiple LOAD segments");
    for(const line of load){
      assert.ok(parseInt(line.trim().split(/\s+/).at(-1),16)>=16384,"16 KiB LOAD alignment required");
    }
  }
});
