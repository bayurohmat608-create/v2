"use strict";

const crypto = require("node:crypto");
const { MEMBERS, ROOMS, assertRoomAccess } = require("./team-registry");

const ACTION_KINDS = Object.freeze(["mention", "delegate", "share"]);
const ACTION_STATES = Object.freeze(["pending", "needs_owner_approval", "rejected"]);

function validateAction(actorId, candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("Action object expected");
  }
  if (typeof actorId !== "string" || !Object.hasOwn(MEMBERS,actorId)) {
    throw new TypeError("Unknown actor");
  }
  const kind = candidate.kind;
  if (!ACTION_KINDS.includes(kind)) throw new Error("Unsupported action kind");
  const sourceRoomId = candidate.sourceRoomId;
  const targetRoomId = candidate.targetRoomId;
  assertRoomAccess(actorId,sourceRoomId);
  if (!Object.hasOwn(ROOMS,targetRoomId)) throw new Error("Unknown target room");
  if (!Object.hasOwn(MEMBERS,candidate.targetMemberId)) throw new Error("Unknown target agent");
  if (candidate.targetMemberId === "owner") throw new Error("Owner cannot be targeted as an agent");
  if (!ROOMS[targetRoomId].members.includes(candidate.targetMemberId)) {
    throw new Error("Target agent not a member of requested room");
  }
  const text=String(candidate.message ?? "");
  if (!text.trim() || Buffer.byteLength(text,"utf8")>8192) throw new RangeError("Invalid action message");
  if (typeof candidate.id!=="string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(candidate.id)) {
    throw new Error("Invalid action id");
  }
  // The same agent may not send to a target private room without membership,
  // even when acting on behalf of an owner.
  // Cross-room operations need explicit approval receipts, not magic phrases.
  const crossRoom = sourceRoomId !== targetRoomId;
  if (kind==="mention" && crossRoom) throw new Error("Mentions must stay in the source room");
  if (kind==="delegate" && crossRoom) throw new Error("Cross-room delegation not yet enabled");
  if (kind==="share" && !crossRoom) throw new Error("Share requires two distinct rooms");
  // Share is not executable until the CP21 consent receipt engine is built.
  const state=kind==="share" ? "needs_owner_approval" : "pending";
  return Object.freeze({
    schemaVersion:1,
    id:candidate.id,
    actorId,
    kind,
    sourceRoomId,
    targetRoomId,
    targetMemberId:candidate.targetMemberId,
    message:text.trim(),
    state,
    createdAt:Number.isSafeInteger(candidate.createdAt) && candidate.createdAt>0
      ? candidate.createdAt : Date.now(),
    evidence: null
  });
}

class PendingActionRegistry {
  #data = new Map();
  create(actorId,request) {
    const action=validateAction(actorId,request);
    const prior=this.#data.get(action.id);
    if(prior) {
      if(prior.actorId!==action.actorId ||
         prior.kind!==action.kind ||
         prior.sourceRoomId!==action.sourceRoomId ||
         prior.targetRoomId!==action.targetRoomId ||
         prior.targetMemberId!==action.targetMemberId ||
         prior.message!==action.message) throw new Error("Action idempotency conflict");
      return {created:false,action:structuredClone(prior)};
    }
    this.#data.set(action.id,action);
    return {created:true,action:structuredClone(action)};
  }
  get(actionId) {
    const action=this.#data.get(actionId);
    return action ? structuredClone(action) : null;
  }
  // Intentionally NO markDone(): engine-produced text is not a tool receipt.
  // Execution is a separate audited service with trusted event source (CP20).
}

module.exports={ ACTION_KINDS,ACTION_STATES,validateAction,PendingActionRegistry };
