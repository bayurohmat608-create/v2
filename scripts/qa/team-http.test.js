"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawn } = require("node:child_process");
const net = require("node:net");
const { once } = require("node:events");

async function reserveEphemeralPort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolveClose, reject) => server.close(e => e ? reject(e) : resolveClose()));
  return port;
}
const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));

test("CP19: backend exposes metadata but never simulates Zovia chat readiness", {timeout: 20000}, async t => {
  const root = resolve(__dirname, "../..");
  const temporary = mkdtempSync(join(tmpdir(), "wa-v2-cp19-"));
  const runtime = join(temporary, "runtime");
  mkdirSync(runtime, { recursive:true });
  const original = {
    topic: "Regression fixture",
    modelA: "codex/gpt-6.1-sol",
    modelB: "opencode/nemotron-3-ultra-free",
    chats: {
      group:[{id:"grp-legacy-01",sender:"user",text:"Do not modify this",time:"10:00"}],
      direct_budi:[{id:"priv-budi-1",text:"DO_NOT_SHARE_BUDI"}],
      direct_rian:[{id:"priv-rian-1",text:"DO_NOT_SHARE_RIAN"}]
    },
    contextMemory:{group:"hello",direct_budi:"private budi memory",direct_rian:"private rian memory"}
  };
  const persistedFile = join(runtime, "chat_data.json");
  writeFileSync(persistedFile, JSON.stringify(original));
  const port=await reserveEphemeralPort();
  const child=spawn(process.execPath, [join(root, "server.js")],{
    cwd:root,
    env:{...process.env, HOST:"127.0.0.1", PORT:String(port), HOME:temporary, CHAT_AI_RUNTIME_DIR:runtime, WAKELOCK_DISABLED:"1"},
    stdio:["ignore","pipe","pipe"]
  });
  let stderr="";
  child.stdout.on("data",()=>{});
  child.stderr.on("data",b=>{stderr=(stderr+b.toString()).slice(-1500);});
  t.after(async()=>{
    if(child.exitCode===null && !child.killed) child.kill("SIGTERM");
    if(child.exitCode===null) {
      await Promise.race([once(child,"exit").catch(()=>{}),sleep(1200)]);
    }
    if(child.exitCode===null) child.kill("SIGKILL");
    rmSync(temporary,{recursive:true,force:true});
  });
  const base="http://127.0.0.1:"+port;
  let ready=false;
  for(let i=0;i<50;i++){
    if(child.exitCode!==null) break;
    try{
      const r=await fetch(base+"/api/status",{signal:AbortSignal.timeout(300)});
      if(r.ok){ready=true;break;}
    }catch{}
    await sleep(110);
  }
  assert.ok(ready,"Server failed startup: "+stderr);
  const teamResponse=await fetch(base+"/api/team",{signal:AbortSignal.timeout(2000)});
  assert.equal(teamResponse.status,200);
  const team=await teamResponse.json();
  assert.deepEqual(team.members.map(p=>p.id).sort(),["owner","budi","rian","zovia"].sort());
  assert.equal(team.chatAgentExecution,"not-enabled");
  assert.equal(team.capabilities.taskScheduler,false);
  assert.deepEqual(team.rooms.find(r=>r.id==="direct_zovia").members,["owner","zovia"]);
  const serialized=JSON.stringify(team);
  assert.ok(!serialized.includes("DO_NOT_SHARE"));
  assert.ok(!serialized.includes("private memory"));

  const oldChats=await (await fetch(base+"/api/chats")).json();
  assert.equal(oldChats.chats.group[0].id,"grp-legacy-01");
  assert.equal(oldChats.chats.direct_budi[0].id,"priv-budi-1");
  assert.equal(oldChats.chats.direct_rian[0].id,"priv-rian-1");
  assert.equal(oldChats.chats.direct_zovia,undefined,"Do not expose future private rooms on legacy global chat API");

  const blocked=await fetch(base+"/api/message",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({chatId:"direct_zovia",text:"please run private task"}),
    signal:AbortSignal.timeout(2000)
  });
  assert.equal(blocked.status,409);
  const error=await blocked.json();
  assert.equal(error.code,"AGENT_NOT_READY");
  const after=JSON.parse(readFileSync(persistedFile,"utf8"));
  assert.deepEqual(after.chats,original.chats,"Blocked request must not alter chat history");
  assert.deepEqual(after.contextMemory,original.contextMemory);
});

test("CP18: V1 social source contract remains present during CP19 backend changes", () => {
  const root=resolve(__dirname,"../..");
  const html=readFileSync(join(root,"web/index.html"),"utf8");
  const js=readFileSync(join(root,"web/app.js"),"utf8");
  const srv=readFileSync(join(root,"server.js"),"utf8");
  const contract=[
    [html,'id="tabStatus"'],
    [html,'id="tabCalls"'],
    [html,'id="chatTopicBanner"'],
    [html,'id="storyViewerCard"'],
    [html,'id="typingBubble"'],
    [html,'id="replyPreviewBar"'],
    [html,'id="attachmentPreviewBar"'],
    [js,'function renderStatusTimeline()'],
    [js,'function renderAllChatPreviews()'],
    [js,'function connectSSE()'],
    [srv,'function createStatus('],
    [srv,'function getPublicStatus()'],
    [srv,'function addFileMessage('],
    [srv,'async function runSingleTurn('],
    [srv,'async function runDirectTurn('],
  ];
  for (const [content,needle] of contract) {
    assert.ok(content.includes(needle), "V1 source feature unexpectedly missing: "+needle);
  }
  // Source presence is a regression guard, not proof of feature/device readiness.
});
