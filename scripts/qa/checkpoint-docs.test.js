"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync,existsSync}=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"../..");
const file=x=>readFileSync(path.join(root,x),"utf8");

test("CP00 cross-session handoff documents live in repo and link each other",()=>{
 const master=file("docs/BLUEPRINT_MASTER_V2.md");
 const tracker=file("docs/CHECKPOINT_TRACKER.md");
 const handoff=file("docs/SESSION_HANDOFF.md");
 const index=file("checkpoints/INDEX.md");
 const readme=file("README.md");
 for(const title of ["BLUEPRINT_MASTER_V2.md","CHECKPOINT_TRACKER.md","SESSION_HANDOFF.md"]){
   assert.ok(index.includes(title), "Checkpoint index missing "+title);
 }
 assert.ok(master.includes("CHECKPOINT_TRACKER.md"));
 assert.ok(master.includes("SESSION_HANDOFF.md"));
 assert.ok(readme.includes("docs/CHECKPOINT_TRACKER.md"));
 assert.ok(handoff.includes("Worktree"));
 assert.ok(tracker.includes("## Rules"));
});

test("Every CP00–CP24 has a master blueprint status row and tracker section",()=>{
 const master=file("docs/BLUEPRINT_MASTER_V2.md");
 const tracker=file("docs/CHECKPOINT_TRACKER.md");
 for(let i=0;i<=24;i++){
   const id="CP"+String(i).padStart(2,"0");
   assert.ok(new RegExp("^\\| "+id+" \\|","m").test(master),"Missing master progress row "+id);
   assert.ok(new RegExp("^## "+id+"\\b","m").test(tracker),"Missing tracker section "+id);
 }
 assert.ok(master.includes("🟡 Sebagian"));
 assert.ok(tracker.includes("✅ [x]"));
 assert.ok(tracker.includes("⬜ [ ]"));
});

test("Checked progress assertions have corresponding source or evidence",()=>{
 const tracker=file("docs/CHECKPOINT_TRACKER.md");
 for(const p of [
  "agent/team-registry.js","agent/private-room-store.js",
  "agent/action-protocol.js","personas/zovia/PERSONA.md",
  "scripts/qa/private-room-store.test.js","scripts/qa/action-protocol.test.js",
  "checkpoints/CP18/PARITY_MATRIX.md","checkpoints/CP00/BASELINE_SHA.txt"
 ]){
  assert.ok(existsSync(path.join(root,p)),"Missing checked artifact "+p);
 }
 assert.ok(tracker.includes("NOT TESTED"),"Do not claim Android verification");
 assert.ok(tracker.includes("NOT CONNECTED"),"Do not claim online Zovia/Antigravity");
 assert.ok(!/## CP19[^\n]*COMPLETE\b/.test(tracker));
 assert.ok(!/## CP20[^\n]*COMPLETE\b/.test(tracker));
});
