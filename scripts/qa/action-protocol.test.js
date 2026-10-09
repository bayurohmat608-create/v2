"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {validateAction,PendingActionRegistry}=require("../../agent/action-protocol");

const base={id:"act-00000001",kind:"mention",sourceRoomId:"group",targetRoomId:"group",targetMemberId:"rian",message:"Rian, please join the group",createdAt:1760000000000};
test("CP20 accepts structured mention as pending, never as an executed claim",()=>{
  const reg=new PendingActionRegistry();
  const entry=reg.create("budi",base);
  assert.equal(entry.created,true);
  assert.equal(entry.action.state,"pending");
  assert.equal(entry.action.evidence,null);
  assert.equal(reg.create("budi",base).created,false);
  assert.equal(typeof reg.markDone,"undefined");
  entry.action.state="completed";
  assert.equal(reg.get(base.id).state,"pending");
});
test("CP20 rejects cross-room delegation and mention",()=>{
  assert.throws(()=>validateAction("budi",{...base,targetRoomId:"direct_rian"}),/Mentions must stay/);
  assert.throws(()=>validateAction("budi",{...base,kind:"delegate",targetRoomId:"direct_rian"}),/Cross-room delegation/);
  assert.throws(()=>validateAction("rian",{...base,sourceRoomId:"direct_budi"}),e=>e.code==="ROOM_ACCESS_DENIED");
});
test("CP20 private share is blocked awaiting owner approval, never automatically executed",()=>{
  const a=validateAction("budi",{...base,kind:"share",targetRoomId:"direct_rian"});
  assert.equal(a.state,"needs_owner_approval");
  assert.equal(a.evidence,null);
  assert.throws(()=>validateAction("budi",{...base,kind:"share"}),/two distinct rooms/);
});
test("CP20 validates target membership, principal, content and idempotency",()=>{
  const reg=new PendingActionRegistry();
  reg.create("budi",base);
  assert.throws(()=>reg.create("budi",{...base,message:"different"}),/Idempotency conflict/i);
  assert.throws(()=>validateAction("budi",{...base,targetMemberId:"owner"}),/Owner cannot be targeted/);
  assert.throws(()=>validateAction("budi",{...base,targetMemberId:"random"}),/Unknown target agent/);
  assert.throws(()=>validateAction("budi",{...base,targetRoomId:"direct_zovia"}),/not a member/);
  assert.throws(()=>validateAction("budi",{...base,message:" "}),/Invalid action message/);
  assert.throws(()=>validateAction("budi",{...base,id:"../../tmp"}),/Invalid action id/);
});
