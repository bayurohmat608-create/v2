"use strict";

/**
 * CP19: deterministic team profile and room privacy contract.
 * This module does not execute agents and never claims an agent is online.
 * Existing V1/V2 room IDs must remain stable for migrated conversations.
 */
const TEAM_SCHEMA_VERSION = 1;
const MEMBERS = Object.freeze({
  owner: Object.freeze({ id: "owner", title: "Owner", displayName: "Mas Bay", personaPath: null }),
  zovia: Object.freeze({ id: "zovia", title: "Software Architect / Orchestrator", displayName: "Zovia", personaPath: "personas/zovia/PERSONA.md" }),
  budi: Object.freeze({ id: "budi", title: "Tech Lead / Senior Software Engineer", displayName: "Budi", personaPath: "personas/ai-1-system.md" }),
  rian: Object.freeze({ id: "rian", title: "Developer", displayName: "Rian", personaPath: "personas/ai-2-system.md" })
});
const ROOMS = Object.freeze({
  group: Object.freeze({ id: "group", kind: "group", members: Object.freeze(["owner", "zovia", "budi", "rian"]) }),
  direct_zovia: Object.freeze({ id: "direct_zovia", kind: "direct", members: Object.freeze(["owner", "zovia"]) }),
  direct_budi: Object.freeze({ id: "direct_budi", kind: "direct", members: Object.freeze(["owner", "budi"]) }),
  direct_rian: Object.freeze({ id: "direct_rian", kind: "direct", members: Object.freeze(["owner", "rian"]) })
});

function assertPrincipal(principalId) {
  if (typeof principalId !== "string" || !Object.hasOwn(MEMBERS, principalId)) {
    throw new TypeError("Unknown team principal");
  }
}

function assertRoom(roomId) {
  if (typeof roomId !== "string" || !Object.hasOwn(ROOMS, roomId)) {
    throw new TypeError("Unknown team room");
  }
}

function canReadRoom(principalId, roomId) {
  assertPrincipal(principalId);
  assertRoom(roomId);
  return ROOMS[roomId].members.includes(principalId);
}

function assertRoomAccess(principalId, roomId) {
  if (!canReadRoom(principalId, roomId)) {
    const error = new Error("Room access denied");
    error.code = "ROOM_ACCESS_DENIED";
    throw error;
  }
}

/**
 * Data migrations are additive. Never rewrite existing legacy arrays, quoted
 * messages, timestamps or custom rooms. Corrupt room formats fail closed.
 */
function upgradeLegacyChats(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Chats must be an object");
  }
  const upgraded = { ...raw };
  for (const id of Object.keys(ROOMS)) {
    if (upgraded[id] === undefined) upgraded[id] = [];
    if (!Array.isArray(upgraded[id])) {
      throw new TypeError("Invalid stored room: " + id);
    }
  }
  return upgraded;
}

function upgradeLegacyMemory(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Context memory must be an object");
  }
  const upgraded = { ...raw };
  for (const id of Object.keys(ROOMS)) {
    if (upgraded[id] === undefined) upgraded[id] = "";
    if (typeof upgraded[id] !== "string") {
      throw new TypeError("Invalid stored memory: " + id);
    }
  }
  return upgraded;
}

/**
 * No implicit cross-room context. Cross-room sharing will require a separate
 * owner-signed consent receipt in CP21, never a model-generated assertion.
 */
function getAuthorizedMessages(chats, principalId, roomId, limit = 30) {
  assertRoomAccess(principalId, roomId);
  if (!Number.isInteger(limit) || limit < 0 || limit > 100) {
    throw new RangeError("Message limit must be between 0 and 100");
  }
  const values = chats && chats[roomId];
  if (!Array.isArray(values)) throw new TypeError("Room history unavailable");
  if (limit === 0) return [];
  return structuredClone(values.slice(-limit));
}

function getTeamRegistry() {
  return {
    schemaVersion: TEAM_SCHEMA_VERSION,
    members: Object.values(MEMBERS).map(persona => ({
      ...persona,
      // A persona existing on disk is not evidence of an online coding engine.
      runtimeState: persona.id === "owner" ? "local-user" : "not-probed"
    })),
    rooms: Object.values(ROOMS).map(room => ({
      id: room.id,
      kind: room.kind,
      members: [...room.members]
    })),
    chatAgentExecution: "not-enabled",
    capabilities: { roleRegistry: true, readScopeGuards: true, taskScheduler: false }
  };
}

module.exports = {
  TEAM_SCHEMA_VERSION, MEMBERS, ROOMS,
  canReadRoom, assertRoomAccess, upgradeLegacyChats,
  upgradeLegacyMemory, getAuthorizedMessages, getTeamRegistry
};
