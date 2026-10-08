"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assertRoomAccess } = require("./team-registry");

const PRIVATE_ROOM = "direct_zovia";
const SCHEMA_VERSION = 1;
const MAX_TEXT_BYTES = 64 * 1024;
const MAX_HISTORY = 10000;

function assertMessage(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    throw new TypeError("Message object required");
  }
  if (typeof message.text !== "string" ||
    Buffer.byteLength(message.text, "utf8") === 0 ||
    Buffer.byteLength(message.text, "utf8") > MAX_TEXT_BYTES) {
    throw new RangeError("Message size out of bounds");
  }
  if (!["owner", "zovia"].includes(message.sender)) {
    throw new Error("Sender not in private room");
  }
  if (typeof message.id !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(message.id)) {
    throw new Error("Invalid message ID");
  }
  if (!Number.isSafeInteger(message.timestamp) || message.timestamp <= 0) {
    throw new Error("Invalid message timestamp");
  }
  // Explicit allowlist avoids accidentally persisting credentials or engine
  // properties that future callers might attach to an arbitrary object.
  return {
    id: message.id, sender: message.sender,
    text: message.text, timestamp: message.timestamp
  };
}

class PrivateRoomStore {
  #dir;
  #file;
  constructor(directory) {
    if (typeof directory !== "string" || !path.isAbsolute(directory)) {
      throw new TypeError("Absolute private-room storage path required");
    }
    this.#dir = directory;
    this.#file = path.join(directory, PRIVATE_ROOM + ".json");
  }
  #ensureDirectory() {
    fs.mkdirSync(this.#dir, { recursive: true, mode: 0o700 });
    if (fs.lstatSync(this.#dir).isSymbolicLink()) {
      throw new Error("Private-room directory cannot be symlinked");
    }
    fs.chmodSync(this.#dir, 0o700);
  }
  #read() {
    this.#ensureDirectory();
    if (!fs.existsSync(this.#file)) return [];
    const stat = fs.lstatSync(this.#file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 * 1024) {
      throw new Error("Unsafe private-room file");
    }
    const data = JSON.parse(fs.readFileSync(this.#file, "utf8"));
    if (!data || data.schemaVersion !== SCHEMA_VERSION ||
        data.roomId !== PRIVATE_ROOM || !Array.isArray(data.messages) ||
        data.messages.length > MAX_HISTORY) {
      throw new Error("Invalid private-room schema");
    }
    const ids = new Set();
    for (const raw of data.messages) {
      const value = assertMessage(raw);
      if (ids.has(value.id)) throw new Error("Duplicated persisted message ID");
      ids.add(value.id);
    }
    return data.messages;
  }
  read(principalId, limit = 30) {
    assertRoomAccess(principalId, PRIVATE_ROOM);
    if (!Number.isInteger(limit) || limit < 0 || limit > 100) {
      throw new RangeError("Read limit out of range");
    }
    const msgs = this.#read();
    return structuredClone(limit === 0 ? [] : msgs.slice(-limit));
  }
  append(principalId, rawMessage) {
    assertRoomAccess(principalId, PRIVATE_ROOM);
    const message = assertMessage(rawMessage);
    if (message.sender !== principalId) {
      throw new Error("Only the authenticated sender can create a message");
    }
    const messages = this.#read();
    const existing = messages.find(item => item.id === message.id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(message)) {
        throw new Error("Idempotency conflict");
      }
      return { created: false, message: structuredClone(existing) };
    }
    if (messages.length >= MAX_HISTORY) throw new Error("Room history limit reached");
    const record = { schemaVersion: SCHEMA_VERSION, roomId: PRIVATE_ROOM, messages: [...messages, message] };
    const tmp = this.#file + "." + crypto.randomBytes(12).toString("hex") + ".tmp";
    let fd;
    try {
      fd = fs.openSync(tmp, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
      fs.writeFileSync(fd, JSON.stringify(record));
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = null;
      fs.renameSync(tmp, this.#file);
      fs.chmodSync(this.#file, 0o600);
      // Ensure the rename survives abrupt process termination on supported FS.
      try {
        const dirFd = fs.openSync(this.#dir, fs.constants.O_RDONLY);
        try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
      } catch {}
    } finally {
      if (fd !== undefined && fd !== null) fs.closeSync(fd);
      try { fs.unlinkSync(tmp); } catch {}
    }
    return { created: true, message: structuredClone(message) };
  }
}
module.exports = { PrivateRoomStore, PRIVATE_ROOM };
