"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, chmodSync, statSync, writeFileSync, symlinkSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { PrivateRoomStore } = require("../../agent/private-room-store");

function withStore(t) {
  const root = mkdtempSync(join(tmpdir(), "wa-v2-zovia-room-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  return { root, file: join(root, "private", "direct_zovia.json"),
    store: new PrivateRoomStore(join(root, "private")) };
}
const msg = (id, sender="owner", text="Message") =>
  ({id,sender,text,timestamp:1750000000000});

test("CP19 private store preserves history across restarts without touching legacy chat", t => {
  const {root,file,store}=withStore(t);
  assert.deepEqual(store.read("owner"),[]);
  const first=store.append("owner",msg("msg-000001"));
  assert.equal(first.created,true);
  assert.equal(store.append("owner",msg("msg-000001")).created,false);
  const restarted=new PrivateRoomStore(join(root,"private"));
  assert.equal(restarted.read("zovia")[0].text,"Message");
  assert.equal(restarted.append("zovia",msg("msg-000002","zovia","review")).created,true);
  assert.equal(store.read("owner").length,2);
  assert.equal(statSync(file).mode & 0o777,0o600);
  assert.equal(statSync(join(root,"private")).mode & 0o777,0o700);
});

test("CP19 only owner/Zovia can access room and cannot forge sender", t => {
  const {store}=withStore(t);
  assert.throws(()=>store.read("budi"),e=>e.code==="ROOM_ACCESS_DENIED");
  assert.throws(()=>store.read("rian"),e=>e.code==="ROOM_ACCESS_DENIED");
  assert.throws(()=>store.append("budi",msg("msg-000001","budi")),e=>e.code==="ROOM_ACCESS_DENIED");
  assert.throws(()=>store.append("zovia",msg("msg-000001","owner")),/authenticated sender/);
  assert.throws(()=>store.read("invalid"),/Unknown team principal/);
  assert.throws(()=>store.read("owner",101),/limit/);
});

test("CP19 rejects tampered data rather than hiding data loss", t => {
  const {store,file}=withStore(t);
  store.append("owner",msg("msg-000001"));
  assert.throws(()=>store.append("owner",msg("msg-000001","owner","Changed")),/Idempotency conflict/);
  writeFileSync(file,"{\"schemaVersion\":1,\"roomId\":\"direct_rian\",\"messages\":[]}");
  assert.throws(()=>store.read("owner"),/schema/);
  writeFileSync(file,"not json");
  assert.throws(()=>store.read("owner"),SyntaxError);
});

test("CP19 bounds payloads and returns defensive copies", t => {
  const {store}=withStore(t);
  assert.throws(()=>store.append("owner",{...msg("msg-000001"),text:"X".repeat(65537)}),/bounds/);
  assert.throws(()=>store.append("owner",msg("../../secret")),/Invalid message ID/);
  assert.throws(()=>store.append("owner",{...msg("msg-000001"),timestamp:NaN}),/timestamp/);
  assert.throws(()=>store.append("owner",msg("msg-000001","zovia")),/authenticated sender/);
  const result=store.append("owner",msg("msg-000001"));
  result.message.text="tampered";
  assert.equal(store.read("owner")[0].text,"Message");
  const list=store.read("owner");
  list[0].text="tampered";
  assert.equal(store.read("owner")[0].text,"Message");
  assert.deepEqual(store.read("owner",0),[]);
});

test("CP19 rejects symlinked private room file", t => {
  const {root,file,store}=withStore(t);
  store.read("owner");
  const external=join(root,"external.json");
  writeFileSync(external,JSON.stringify({schemaVersion:1,roomId:"direct_zovia",messages:[]}));
  symlinkSync(external,file);
  assert.throws(()=>store.read("owner"),/Unsafe private-room file/);
  assert.equal(readFileSync(external,"utf8").includes("direct_zovia"),true);
});
