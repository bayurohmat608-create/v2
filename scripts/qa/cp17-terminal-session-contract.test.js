"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {join,resolve}=require("node:path");
const root=resolve(__dirname,"../..");
const terminal=readFileSync(join(root,"android/app/src/main/java/com/bossbayu/aiteam/terminal/TerminalSession.kt"),"utf8");
const proot=readFileSync(join(root,"android/app/src/main/java/com/bossbayu/aiteam/runtime/PRootManager.kt"),"utf8");

test("CP17 terminal carries PRoot launcher environment to the process",()=>{
  assert.match(terminal,/pb\.environment\(\)\.putAll\(prootManager\.runtimeEnvironment\(\)\)/);
  for(const variable of ["PROOT_LOADER","PROOT_TMP_DIR","TMPDIR","LD_LIBRARY_PATH"]){
    assert.match(proot,new RegExp('"'+variable+'"'));
  }
  assert.match(terminal,/check\(prootManager\.isPRootInstalled\(\)\)/);
  assert.match(terminal,/prootManager\.buildCommand\(/);
});

test("CP17 terminal never reports ready before guest process actually responds",()=>{
  assert.doesNotMatch(terminal,/Terminal Tim AI[^\n]*Siap/);
  assert.match(terminal,/CP16_TERMINAL_SHELL_STARTED/);
  assert.match(terminal,/val exitCode = proc\.waitFor\(\)/);
  assert.match(terminal,/Terminal selesai \(exit=\$exitCode\)/);
  assert.match(terminal,/Shell belum siap atau sudah berhenti/);
});

test("CP17 terminal remains pipe-backed and serialized, without false PTY support",()=>{
  assert.match(terminal,/pb\.redirectErrorStream\(true\)/);
  assert.match(terminal,/synchronized\(processLock\)/);
  assert.match(terminal,/sessionScope\.cancel\(\)/);
  assert.doesNotMatch(terminal,/\bpty\.open\(|\bPseudoTerminal\(/);
});
