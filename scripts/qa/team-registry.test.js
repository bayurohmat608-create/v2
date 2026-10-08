"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {
  ROOMS, canReadRoom, assertRoomAccess,
  upgradeLegacyChats, upgradeLegacyMemory,
  getAuthorizedMessages, getTeamRegistry
} = require("../../agent/team-registry");

test("CP19 adds Zovia without altering existing chat arrays and message IDs", () => {
  const original = {
    group: [{id:"group-1",text:"hello",timestamp:10}],
    direct_budi: [{id:"b-1",text:"private",timestamp:11}],
    direct_rian: [{id:"r-1",text:"other private",timestamp:12}]
  };
  const snapshot = JSON.stringify(original);
  const upgraded = upgradeLegacyChats(original);
  assert.deepEqual(Object.keys(upgraded).sort(), ["group","direct_budi","direct_rian","direct_zovia"].sort());
  for (const key of Object.keys(original)) assert.strictEqual(upgraded[key], original[key]);
  assert.deepEqual(upgraded.direct_zovia, []);
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(upgradeLegacyChats(upgraded).direct_zovia.length, 0);
  assert.throws(() => upgradeLegacyChats({ group: "oops" }), /Invalid stored room/);
});

test("CP19 keeps saved context intact and creates a private Zovia namespace", () => {
  const memory = {group:"group notes",direct_budi:"budi private",direct_rian:"rian private"};
  const migrated = upgradeLegacyMemory(memory);
  assert.equal(migrated.direct_zovia, "");
  assert.equal(migrated.direct_budi, memory.direct_budi);
  assert.equal(memory.direct_zovia, undefined);
  assert.throws(() => upgradeLegacyMemory({direct_zovia:[]}), /Invalid stored memory/);
});

test("CP19 denies cross-room reads even if the caller has the entire chat database", () => {
  const chats = {
    group:[{id:1,text:"project overview"}],
    direct_budi:[{id:2,text:"SECRET_BUDI_JAPRI"}],
    direct_rian:[{id:3,text:"SECRET_RIAN_JAPRI"}],
    direct_zovia:[{id:4,text:"SECRET_ZOVIA_JAPRI"}]
  };
  for (const id of ["budi","rian","zovia"]) {
    assert.equal(canReadRoom(id,"group"),true);
    assert.deepEqual(getAuthorizedMessages(chats,id,"group"),chats.group);
  }
  assert.deepEqual(getAuthorizedMessages(chats,"budi","direct_budi"),chats.direct_budi);
  assert.deepEqual(getAuthorizedMessages(chats,"rian","direct_rian"),chats.direct_rian);
  assert.deepEqual(getAuthorizedMessages(chats,"zovia","direct_zovia"),chats.direct_zovia);
  for (const [person,room] of [["budi","direct_rian"],["budi","direct_zovia"],["rian","direct_budi"],["zovia","direct_budi"],["zovia","direct_rian"]]) {
    assert.equal(canReadRoom(person,room),false);
    assert.throws(() => getAuthorizedMessages(chats,person,room),e=>e.code==="ROOM_ACCESS_DENIED");
  }
  assert.equal(getAuthorizedMessages(chats,"owner","direct_zovia")[0].text,"SECRET_ZOVIA_JAPRI");
});

test("CP19 returns defensive history snapshots with bounded scope", () => {
  const chats=upgradeLegacyChats({group:Array.from({length:120},(_,i)=>({id:i,payload:{v:1}}))});
  assert.equal(getAuthorizedMessages(chats,"budi","group",20).length,20);
  const copy=getAuthorizedMessages(chats,"budi","group",2);
  copy[0].payload.v=999;
  assert.equal(chats.group[118].payload.v,1);
  assert.deepEqual(getAuthorizedMessages(chats,"budi","group",0),[]);
  assert.throws(()=>getAuthorizedMessages(chats,"budi","group",101),/limit/);
  assert.throws(()=>assertRoomAccess("random","group"),/Unknown/);
  assert.throws(()=>assertRoomAccess("budi","__proto__"),/Unknown/);
});

test("CP19 roster is factual, immutable source and flags execution as not enabled", () => {
  const data=getTeamRegistry();
  assert.equal(data.schemaVersion,1);
  assert.deepEqual(data.members.map(x=>x.id).sort(),["owner","zovia","budi","rian"].sort());
  assert.equal(data.chatAgentExecution,"not-enabled");
  assert.equal(data.capabilities.taskScheduler,false);
  assert.deepEqual(ROOMS.direct_zovia.members,["owner","zovia"]);
  const root=path.resolve(__dirname,"../..");
  for(const persona of data.members) {
    if(persona.personaPath) assert.equal(fs.statSync(path.join(root,persona.personaPath)).isFile(),true);
    if(persona.id!=="owner") assert.equal(persona.runtimeState,"not-probed");
  }
});
