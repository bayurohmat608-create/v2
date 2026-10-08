const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile, spawn, spawnSync } = require("child_process");
const { getTeamRegistry } = require("./agent/team-registry");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const USER_HOME = process.env.HOME || __dirname;
const RUNTIME_DIR = process.env.CHAT_AI_RUNTIME_DIR || path.join(__dirname, ".runtime");
const LOCAL_BIN_DIR = path.join(__dirname, ".local", "bin");
const NODE_BIN_DIR = path.join(__dirname, "node_modules", ".bin");
const DEFAULT_CODEX_HOME = process.env.CODEX_HOME || path.join(USER_HOME, ".codex");
const RUNTIME_PATH = [
  LOCAL_BIN_DIR,
  NODE_BIN_DIR,
  path.join(USER_HOME, ".local", "bin"),
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  process.env.PATH || ""
].filter(Boolean).join(path.delimiter);

const IS_ANDROID_RUNTIME = ["1", "true", "yes"].includes(
  String(process.env.ANDROID_RUNTIME || "").toLowerCase()
);
const ANDROID_ROOTFS_DIR = process.env.ANDROID_ROOTFS_DIR || "";
const ANDROID_PROOT_BIN = process.env.ANDROID_PROOT_BIN || "";
const ANDROID_PROOT_LOADER = process.env.ANDROID_PROOT_LOADER || "";
const ANDROID_NATIVE_LIB_DIR = process.env.ANDROID_NATIVE_LIB_DIR || "";
const ANDROID_GUEST_RUNTIME_DIR = process.env.ANDROID_GUEST_RUNTIME_DIR || "/opt/aiteam/runtime";
const ANDROID_GUEST_ENGINE_BIN_DIR = process.env.ANDROID_GUEST_ENGINE_BIN_DIR || "/opt/aiteam/bin";
const ANDROID_GUEST_HOME_DIR = process.env.ANDROID_GUEST_HOME_DIR || "/opt/aiteam/runtime/home";

function isPathWithin(candidate, base) {
  if (!candidate || !base) return false;
  const resolvedCandidate = path.resolve(candidate);
  const resolvedBase = path.resolve(base);
  return resolvedCandidate === resolvedBase ||
    resolvedCandidate.startsWith(resolvedBase + path.sep);
}

function toAndroidGuestPath(hostPath) {
  if (!IS_ANDROID_RUNTIME || !hostPath) return hostPath;

  const resolved = path.resolve(hostPath);
  const map = [
    [BUDI_WORKSPACE, "/opt/workspaces/budi"],
    [RIAN_WORKSPACE, "/opt/workspaces/rian"],
    [RUNTIME_DIR, ANDROID_GUEST_RUNTIME_DIR]
  ];

  for (const [hostBase, guestBase] of map) {
    if (isPathWithin(resolved, hostBase)) {
      const rel = path.relative(path.resolve(hostBase), resolved);
      return rel ? path.posix.join(guestBase, ...rel.split(path.sep)) : guestBase;
    }
  }

  return resolved;
}

function getAndroidGuestEnginePath(command) {
  const names = {
    opencode: "opencode",
    codex: "codex"
  };
  const name = names[command];
  if (!name) throw new Error(`Engine Android tidak dikenali: ${command}`);
  return path.posix.join(ANDROID_GUEST_ENGINE_BIN_DIR, name);
}

function buildEngineLaunch(command, args = [], options = {}) {
  const env = options.env || process.env;
  const cwd = options.cwd || BUDI_WORKSPACE;

  if (!IS_ANDROID_RUNTIME) {
    return {
      command,
      args,
      cwd,
      env
    };
  }

  if (!ANDROID_ROOTFS_DIR || !ANDROID_PROOT_BIN || !ANDROID_PROOT_LOADER) {
    throw new Error("Android Linux runtime belum diprovisikan lengkap.");
  }

  const userName = String(env.USER || "aiteam").replace(/[^a-zA-Z0-9_-]/g, "") || "aiteam";
  const hostGuestHome = path.join(RUNTIME_DIR, "home", userName);
  try { fs.mkdirSync(hostGuestHome, { recursive: true }); } catch {}

  const guestCwd = toAndroidGuestPath(cwd);
  const guestHome = path.posix.join(ANDROID_GUEST_HOME_DIR, userName);
  const guestWorkspace = toAndroidGuestPath(env.WORKSPACE || cwd);

  const guestEnv = {
    HOME: guestHome,
    USER: userName,
    LOGNAME: userName,
    WORKSPACE: guestWorkspace,
    CURRENT_CHAT_ID: env.CURRENT_CHAT_ID || "group",
    PATH: `${ANDROID_GUEST_ENGINE_BIN_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
    TMPDIR: "/tmp",
    LANG: "C.UTF-8",
    SSL_CERT_FILE: "/etc/ssl/certs/ca-certificates.crt"
  };

  if (env.CODEX_HOME) guestEnv.CODEX_HOME = toAndroidGuestPath(env.CODEX_HOME);
  if (env.GODEBUG) guestEnv.GODEBUG = env.GODEBUG;

  const guestEnvArgs = Object.entries(guestEnv).map(([key, value]) => `${key}=${value}`);
  const prootArgs = [
    "-0",
    "-r", ANDROID_ROOTFS_DIR,
    "-b", `${BUDI_WORKSPACE}:/opt/workspaces/budi`,
    "-b", `${RIAN_WORKSPACE}:/opt/workspaces/rian`,
    "-b", `${RUNTIME_DIR}:${ANDROID_GUEST_RUNTIME_DIR}`,
    "-b", "/dev",
    "-b", "/proc",
    "-w", guestCwd,
    "/usr/bin/env",
    ...guestEnvArgs,
    getAndroidGuestEnginePath(command),
    ...args
  ];

  const prootTemp = path.join(RUNTIME_DIR, "proot-tmp");
  try { fs.mkdirSync(prootTemp, { recursive: true }); } catch {}

  return {
    command: ANDROID_PROOT_BIN,
    args: prootArgs,
    cwd: RUNTIME_DIR,
    env: {
      ...process.env,
      PROOT_LOADER: ANDROID_PROOT_LOADER,
      PROOT_TMP_DIR: prootTemp,
      TMPDIR: prootTemp,
      LD_LIBRARY_PATH: ANDROID_NATIVE_LIB_DIR
    }
  };
}

function spawnEngine(command, args, options = {}) {
  const launch = buildEngineLaunch(command, args, options);
  return spawn(launch.command, launch.args, {
    ...options,
    cwd: launch.cwd,
    env: launch.env
  });
}

function spawnEngineSync(command, args, options = {}) {
  const launch = buildEngineLaunch(command, args, options);
  return spawnSync(launch.command, launch.args, {
    ...options,
    cwd: launch.cwd,
    env: launch.env
  });
}

function execEngine(command, args, options, callback) {
  const launch = buildEngineLaunch(command, args, options || {});
  return execFile(
    launch.command,
    launch.args,
    {
      ...(options || {}),
      cwd: launch.cwd,
      env: launch.env
    },
    callback
  );
}
const PERSONA_A_PATH = path.join(__dirname, "personas", "ai-1-system.md");
const PERSONA_B_PATH = path.join(__dirname, "personas", "ai-2-system.md");
const WEB_DIR = path.join(__dirname, "web");

// Workspaces and Shared Chat Files Storage
const BUDI_WORKSPACE = process.env.BUDI_WORKSPACE || path.join(RUNTIME_DIR, "workspaces", "budi");
const RIAN_WORKSPACE = process.env.RIAN_WORKSPACE || path.join(RUNTIME_DIR, "workspaces", "rian");
const CHAT_FILES_DIR = process.env.CHAT_FILES_DIR || path.join(RUNTIME_DIR, "chat_files");
const CHAT_INDEX_FILE = path.join(CHAT_FILES_DIR, "index.json");
const CHAT_DATA_FILE = process.env.CHAT_DATA_FILE || path.join(RUNTIME_DIR, "chat_data.json");

// Ensure directories exist
try {
  if (!fs.existsSync(BUDI_WORKSPACE)) fs.mkdirSync(BUDI_WORKSPACE, { recursive: true });
  if (!fs.existsSync(RIAN_WORKSPACE)) fs.mkdirSync(RIAN_WORKSPACE, { recursive: true });
  if (!fs.existsSync(CHAT_FILES_DIR)) fs.mkdirSync(CHAT_FILES_DIR, { recursive: true });
  if (!fs.existsSync(CHAT_INDEX_FILE)) fs.writeFileSync(CHAT_INDEX_FILE, "[]");
} catch (e) {
  console.error("Directory init error:", e);
}

// ===== WORKSTATION ENGINE STATE (Alpine / Ubuntu) =====
const WORKSTATION_STATE_FILE = path.join(RUNTIME_DIR, "workstation_state.json");
let activeWorkstation = "alpine";
if (fs.existsSync(WORKSTATION_STATE_FILE)) {
  try {
    const ws = JSON.parse(fs.readFileSync(WORKSTATION_STATE_FILE, "utf-8"));
    if (ws.active) activeWorkstation = ws.active;
  } catch {}
}

// ===== MULTI-PROFILE AUTH VAULT (OpenAI Codex) =====
const AUTH_VAULT_DIR = process.env.AUTH_VAULT_DIR || path.join(RUNTIME_DIR, "auth_vault");
const AUTH_VAULT_FILE = path.join(AUTH_VAULT_DIR, "vault.json");

let authVault = {
  active: {
    codex: "codex-default"
  },
  profiles: []
};

function parseEmailFromJwt(jwt) {
  if (!jwt || typeof jwt !== "string") return null;
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    const jsonStr = Buffer.from(payload, "base64").toString("utf8");
    const data = JSON.parse(jsonStr);
    return data.email || null;
  } catch {
    return null;
  }
}

function maskCredential(str) {
  if (!str || typeof str !== "string") return "●●●●●●●●";
  const trimmed = str.trim();
  if (trimmed.length <= 8) return "●●●●●●●●";
  if (trimmed.startsWith("sk-")) {
    return `sk-...${trimmed.slice(-4)}`;
  }
  if (trimmed.startsWith("ya29.")) {
    return `ya29...${trimmed.slice(-6)}`;
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function initAuthVault() {
  try {
    if (!fs.existsSync(AUTH_VAULT_DIR)) fs.mkdirSync(AUTH_VAULT_DIR, { recursive: true });
    const codexVaultDir = path.join(AUTH_VAULT_DIR, "codex");
    if (!fs.existsSync(codexVaultDir)) fs.mkdirSync(codexVaultDir, { recursive: true });

    let loaded = null;
    if (fs.existsSync(AUTH_VAULT_FILE)) {
      loaded = JSON.parse(fs.readFileSync(AUTH_VAULT_FILE, "utf-8"));
    }

    const defaultCodexAuthPath = path.join(DEFAULT_CODEX_HOME, "auth.json");
    let codexEmail = "Akun Utama Codex";
    if (fs.existsSync(defaultCodexAuthPath)) {
      try {
        const cData = JSON.parse(fs.readFileSync(defaultCodexAuthPath, "utf-8"));
        const extractedEmail = parseEmailFromJwt(cData.tokens && cData.tokens.id_token);
        if (extractedEmail) codexEmail = extractedEmail;
      } catch {}
    }

    const codexProfiles = Array.isArray(loaded?.profiles)
      ? loaded.profiles.filter(p => p && p.engine === "codex")
      : [];

    if (!codexProfiles.some(p => p.id === "codex-default")) {
      codexProfiles.unshift({
        id: "codex-default",
        engine: "codex",
        alias: `Akun ChatGPT Utama (${codexEmail})`,
        email: codexEmail,
        type: "chatgpt_oauth",
        masked: "chatgpt-default",
        dir: DEFAULT_CODEX_HOME,
        createdAt: Date.now()
      });
    }

    const validIds = new Set(codexProfiles.map(p => p.id));
    const requestedActive = loaded?.active?.codex;
    const activeCodex = validIds.has(requestedActive) ? requestedActive : "codex-default";

    authVault = {
      active: { codex: activeCodex },
      personaBinding: {
        budi: {
          codex: validIds.has(loaded?.personaBinding?.budi?.codex)
            ? loaded.personaBinding.budi.codex
            : null
        },
        rian: {
          codex: validIds.has(loaded?.personaBinding?.rian?.codex)
            ? loaded.personaBinding.rian.codex
            : null
        }
      },
      profiles: codexProfiles
    };

    // Remove only the app-owned legacy Antigravity vault copy. Never touch
    // external user-managed ~/.gemini or terminal-managed files.
    const legacyAgyVaultDir = path.join(AUTH_VAULT_DIR, "antigravity");
    if (fs.existsSync(legacyAgyVaultDir)) {
      fs.rmSync(legacyAgyVaultDir, { recursive: true, force: true });
    }

    saveAuthVault();
  } catch (err) {
    console.error("Error initializing auth vault:", err);
  }
}

function saveAuthVault() {
  try {
    fs.writeFileSync(AUTH_VAULT_FILE, JSON.stringify(authVault, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error("Error saving auth vault:", err);
  }
}

function getActiveAuthProfile(engine, speaker = null) {
  if (speaker) {
    const persona = (speaker === "A" || speaker === "budi") ? "budi" : ((speaker === "B" || speaker === "rian") ? "rian" : null);
    if (persona && authVault.personaBinding && authVault.personaBinding[persona]) {
      const boundId = authVault.personaBinding[persona][engine];
      if (boundId) {
        const boundProfile = authVault.profiles.find(p => p.id === boundId);
        if (boundProfile) return boundProfile;
      }
    }
  }

  const activeId = authVault.active && authVault.active[engine];
  if (!activeId) return null;
  return authVault.profiles.find(p => p.id === activeId) || null;
}

function getPublicAuthVault() {
  const supportedProfiles = authVault.profiles.filter(p => p.engine !== "antigravity");
  return {
    active: { codex: authVault.active && authVault.active.codex ? authVault.active.codex : null },
    personaBinding: {
      budi: { codex: authVault.personaBinding?.budi?.codex || null },
      rian: { codex: authVault.personaBinding?.rian?.codex || null }
    },
    profiles: supportedProfiles.map(p => ({
      id: p.id,
      engine: p.engine,
      alias: p.alias,
      email: p.email,
      type: p.type,
      masked: p.masked,
      createdAt: p.createdAt
    }))
  };
}

function switchAuthProfile(engine, profileId) {
  if (engine === "antigravity") throw new Error("Integrasi Antigravity dinonaktifkan untuk kepatuhan Terms.");
  if (!engine || !profileId) throw new Error("Engine dan profileId diperlukan");
  const target = authVault.profiles.find(p => p.id === profileId && p.engine === engine);
  if (!target) throw new Error("Profil akun tidak ditemukan untuk engine ini");

  authVault.active[engine] = profileId;
  saveAuthVault();
  broadcastSSE("auth_vault", getPublicAuthVault());
  return target;
}

function addAuthProfile({ engine, alias, credential, setAsActive }) {
  if (engine !== "codex") {
    throw new Error("Hanya profil OpenAI Codex yang didukung oleh aplikasi.");
  }
  if (!credential || typeof credential !== "string" || !credential.trim()) {
    throw new Error("Kredensial / token / API key tidak boleh kosong");
  }

  const trimmedCred = credential.trim();
  const profileId = `codex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const profileDir = path.join(AUTH_VAULT_DIR, "codex", profileId);
  fs.mkdirSync(profileDir, { recursive: true });

  let email = null;
  let credType = "token";
  let masked = maskCredential(trimmedCred);
  let authJsonStr = "";

  if (trimmedCred.startsWith("sk-")) {
    credType = "api_key";
    authJsonStr = JSON.stringify({
      auth_mode: "api_key",
      OPENAI_API_KEY: trimmedCred
    }, null, 2);
  } else {
    try {
      const parsed = JSON.parse(trimmedCred);
      if (parsed.tokens && parsed.tokens.id_token) {
        email = parseEmailFromJwt(parsed.tokens.id_token);
      }
      authJsonStr = JSON.stringify(parsed, null, 2);
      credType = "chatgpt_oauth";
      if (parsed.tokens?.access_token) masked = maskCredential(parsed.tokens.access_token);
    } catch {
      authJsonStr = JSON.stringify({
        auth_mode: "token",
        tokens: { access_token: trimmedCred }
      }, null, 2);
      credType = "access_token";
    }
  }

  fs.writeFileSync(path.join(profileDir, "auth.json"), authJsonStr, { mode: 0o600 });
  try {
    if (fs.existsSync(path.join(DEFAULT_CODEX_HOME, "config.toml"))) {
      fs.copyFileSync(
        path.join(DEFAULT_CODEX_HOME, "config.toml"),
        path.join(profileDir, "config.toml")
      );
    }
  } catch {}

  const finalAlias =
    (alias && alias.trim()) ||
    (email ? `Akun ChatGPT (${email})` : "Akun OpenAI Codex Baru");

  const newProfile = {
    id: profileId,
    engine: "codex",
    alias: finalAlias,
    email: email || "",
    type: credType,
    masked,
    dir: profileDir,
    createdAt: Date.now()
  };

  authVault.profiles.push(newProfile);
  if (setAsActive) authVault.active.codex = profileId;
  saveAuthVault();
  broadcastSSE("auth_vault", getPublicAuthVault());
  return newProfile;
}

function deleteAuthProfile(profileId) {
  const profile = authVault.profiles.find(p => p.id === profileId);
  if (!profile) throw new Error("Profil akun tidak ditemukan");

  const sameEngineProfiles = authVault.profiles.filter(p => p.engine === profile.engine);
  if (sameEngineProfiles.length <= 1) {
    throw new Error("Tidak dapat menghapus satu-satunya akun. Minimal harus ada 1 akun untuk engine ini.");
  }

  if (profile.dir && profile.dir.startsWith(AUTH_VAULT_DIR)) {
    try { fs.rmSync(profile.dir, { recursive: true, force: true }); } catch {}
  }

  authVault.profiles = authVault.profiles.filter(p => p.id !== profileId);
  if (authVault.active[profile.engine] === profileId) {
    const fallback = authVault.profiles.find(p => p.engine === profile.engine);
    if (fallback) authVault.active[profile.engine] = fallback.id;
  }

  saveAuthVault();
  broadcastSSE("auth_vault", getPublicAuthVault());
  return { success: true };
}

// ===== REAL NATIVE AUTH HANDLERS (OpenAI Codex Device Auth) =====
const pendingCodexLogins = new Map();

// --- OpenAI Codex Native Device Auth ---
function startCodexDeviceLogin(alias = "") {
  return new Promise((resolve, reject) => {
    const loginId = `cdx-login-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const profileId = `codex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const profileDir = path.join(AUTH_VAULT_DIR, "codex", profileId);

    try {
      if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
      if (fs.existsSync(path.join(DEFAULT_CODEX_HOME, "config.toml"))) {
        fs.copyFileSync(path.join(DEFAULT_CODEX_HOME, "config.toml"), path.join(profileDir, "config.toml"));
      }
    } catch (e) {
      return reject(new Error("Gagal membuat direktori profil Codex: " + e.message));
    }

    const env = {
      ...process.env,
      CODEX_HOME: profileDir,
      PATH: RUNTIME_PATH
    };

    const child = spawnEngine("codex", ["login", "--device-auth"], {
      env,
      cwd: profileDir,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let detectedCode = null;
    let authUrl = "https://auth.openai.com/codex/device";
    let stdoutBuffer = "";
    let isResolved = false;

    const session = {
      loginId,
      profileId,
      profileDir,
      alias: alias.trim(),
      child,
      deviceCode: null,
      authUrl,
      status: "initializing",
      email: null,
      createdAt: Date.now()
    };
    pendingCodexLogins.set(loginId, session);

    // Timeout waiting for device code output (15 seconds)
    const initTimer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        session.status = "failed";
        session.error = "Timeout menunggu kode otorisasi dari OpenAI CLI";
        try { child.kill("SIGKILL"); } catch {}
        reject(new Error("Timeout menunggu kode otorisasi dari OpenAI Codex"));
      }
    }, 15000);

    // Overall expiration (15 minutes)
    const expiryTimer = setTimeout(() => {
      if (session.status === "waiting_approval") {
        session.status = "expired";
        session.error = "Kode otorisasi telah kedaluwarsa setelah 15 menit.";
        try { child.kill("SIGKILL"); } catch {}
        try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
      }
    }, 15 * 60 * 1000);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutBuffer += text;

      // Extract auth URL if explicitly printed
      const urlMatch = text.match(/https:\/\/auth\.openai\.com[^\s\n]+/i);
      if (urlMatch) {
        authUrl = urlMatch[0].replace(/\u001b\[[0-9;]*m/g, "").trim();
        session.authUrl = authUrl;
      }

      // Extract device code (e.g. JNX9-S4CNL)
      if (!detectedCode) {
        const cleanText = text.replace(/\u001b\[[0-9;]*m/g, "");
        const codeMatch = cleanText.match(/([A-Z0-9]{4,5}-[A-Z0-9]{4,5})/);
        if (codeMatch) {
          detectedCode = codeMatch[1].trim();
          session.deviceCode = detectedCode;
          session.status = "waiting_approval";
          if (!isResolved) {
            isResolved = true;
            clearTimeout(initTimer);
            resolve({
              loginId,
              deviceCode: detectedCode,
              authUrl: session.authUrl
            });
          }
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      const errText = chunk.toString();
      console.warn(`[Codex Login Stderr]:`, errText);
    });

    child.on("error", (err) => {
      console.error(`[Codex Login Error]:`, err);
      session.status = "failed";
      session.error = err.message;
      if (!isResolved) {
        isResolved = true;
        clearTimeout(initTimer);
        reject(err);
      }
    });

    child.on("close", (code) => {
      clearTimeout(expiryTimer);
      const authJsonPath = path.join(profileDir, "auth.json");
      if (code === 0 && fs.existsSync(authJsonPath)) {
        try {
          const authData = JSON.parse(fs.readFileSync(authJsonPath, "utf-8"));
          const idToken = authData.tokens && authData.tokens.id_token;
          const email = parseEmailFromJwt(idToken) || (authData.tokens ? "ChatGPT User" : "");
          session.email = email;

          const finalAlias = session.alias || (email ? `Akun ChatGPT (${email})` : `Akun ChatGPT Plus/Pro`);
          const maskedToken = maskCredential(authData.tokens ? authData.tokens.access_token : "chatgpt-oauth");

          const newProfile = {
            id: profileId,
            engine: "codex",
            alias: finalAlias,
            email: email,
            type: "chatgpt_oauth",
            masked: maskedToken,
            dir: profileDir,
            createdAt: Date.now()
          };

          authVault.profiles.push(newProfile);
          authVault.active.codex = profileId; // Set active profile
          saveAuthVault();
          broadcastSSE("auth_vault", getPublicAuthVault());

          session.status = "success";
          session.profile = newProfile;
          console.log(`[Codex Login] Berhasil login akun OpenAI: ${email} (${profileId})`);
        } catch (parseErr) {
          session.status = "failed";
          session.error = "Gagal memproses berkas otentikasi: " + parseErr.message;
        }
      } else {
        if (session.status !== "success") {
          session.status = "failed";
          session.error = session.error || `Codex login berhenti dengan kode status ${code}`;
          // Clean up profile dir on failed login
          try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
        }
      }
    });
  });
}

function cancelCodexDeviceLogin(loginId) {
  const session = pendingCodexLogins.get(loginId);
  if (!session) return false;
  if (session.child) {
    try { session.child.kill("SIGKILL"); } catch {}
  }
  if (session.profileDir && fs.existsSync(session.profileDir) && session.status !== "success") {
    try { fs.rmSync(session.profileDir, { recursive: true, force: true }); } catch {}
  }
  pendingCodexLogins.delete(loginId);
  return true;
}


initAuthVault();

// ===== WAKELOCK (anti-kill Android) =====
const WAKELOCK_FILE = path.join(RUNTIME_DIR, ".wakelock");
const WAKELOCK_HEARTBEAT_FILE = path.join(RUNTIME_DIR, ".wakelock_heartbeat");
const WAKELOCK_STOP_FILE = path.join(RUNTIME_DIR, ".wakelock_stop");
const WAKELOCK_LOG_FILE = path.join(RUNTIME_DIR, "wakelock.log");

let wakelock = {
  acquired: false,
  acquiredAt: null,
  reason: null,
  pid: process.pid,
  heartbeatAt: null
};

function wakelog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(WAKELOCK_LOG_FILE, line); } catch {}
  console.log(msg);
}

function acquireWakelock(reason = "manual") {
  wakelock.acquired = true;
  wakelock.acquiredAt = wakelock.acquiredAt || new Date().toISOString();
  wakelock.reason = reason;
  try {
    fs.writeFileSync(WAKELOCK_FILE, JSON.stringify({
      pid: process.pid,
      acquiredAt: wakelock.acquiredAt,
      reason
    }));
  } catch {}
  try { if (fs.existsSync(WAKELOCK_STOP_FILE)) fs.unlinkSync(WAKELOCK_STOP_FILE); } catch {}
  updateHeartbeat();
  wakelog(`🔒 Wakelock ACQUIRED (pid=${process.pid}, reason=${reason}). Server menolak dimatikan kecuali kamu sendiri yang melepas.`);
  return getWakelockStatus();
}

function releaseWakelock(reason = "manual") {
  wakelock.acquired = false;
  try { if (fs.existsSync(WAKELOCK_FILE)) fs.unlinkSync(WAKELOCK_FILE); } catch {}
  wakelog(`🔓 Wakelock RELEASED (reason=${reason}). Server sekarang boleh dimatikan.`);
  return getWakelockStatus();
}

function isWakelockHeld() {
  return wakelock.acquired === true;
}

function userRequestedStop() {
  try { return fs.existsSync(WAKELOCK_STOP_FILE); } catch { return false; }
}

function updateHeartbeat() {
  wakelock.heartbeatAt = new Date().toISOString();
  try {
    fs.writeFileSync(WAKELOCK_HEARTBEAT_FILE, JSON.stringify({
      pid: process.pid,
      at: wakelock.heartbeatAt,
      wakelock: wakelock.acquired
    }));
  } catch {}
}

function getWakelockStatus() {
  return {
    acquired: wakelock.acquired,
    acquiredAt: wakelock.acquiredAt,
    reason: wakelock.reason,
    pid: process.pid,
    uptimeSec: Math.floor(process.uptime()),
    heartbeatAt: wakelock.heartbeatAt
  };
}

setInterval(() => {
  updateHeartbeat();
}, 10000);

function guardSignal(sig) {
  if (isWakelockHeld() && !userRequestedStop()) {
    wakelog(`🛡️ Menolak ${sig} — wakelock aktif. Buat file .wakelock_stop atau panggil POST /api/wakelock {action:"release"} dulu kalau memang mau mematikan.`);
    broadcastSSE("wakelock", getWakelockStatus());
    return;
  }
  wakelog(`🛑 Menerima ${sig} dan wakelock tidak aktif / stop diminta — keluar dengan hormat.`);
  gracefulExit(0);
}

function gracefulExit(code) {
  try { if (nextTurnTimeout) clearTimeout(nextTurnTimeout); } catch {}
  process.exit(code);
}

process.on("SIGTERM", () => guardSignal("SIGTERM"));
process.on("SIGINT", () => guardSignal("SIGINT"));
process.on("SIGHUP", () => guardSignal("SIGHUP"));
process.on("uncaughtException", (err) => {
  console.error("⚠️ uncaughtException (tidak exit karena wakelock):", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ unhandledRejection (tidak exit karena wakelock):", reason);
});

const WAKELOCK_DISABLED = ["1", "true", "yes"].includes(String(process.env.WAKELOCK_DISABLED || "").toLowerCase());
if (WAKELOCK_DISABLED) {
  wakelog("🔓 Wakelock dinonaktifkan oleh environment (mode test/managed runtime).");
} else {
  acquireWakelock("auto-boot");
}

const DEFAULT_MODELS = [
  // --- OpenAI Codex Engine Models ---
  { id: "codex/gpt-6.1-sol", name: "OpenAI Codex · GPT-6.1 Sol (Default & Super Cerdas)", engine: "codex", group: "OpenAI Codex Models" },
  { id: "codex/gpt-6-astra", name: "OpenAI Codex · GPT-6 Astra (Flagship)", engine: "codex", group: "OpenAI Codex Models" },
  { id: "codex/gpt-5.6-sol", name: "OpenAI Codex · GPT-5.6 Sol (Cepat & Presisi)", engine: "codex", group: "OpenAI Codex Models" },
  { id: "codex/gpt-5.5", name: "OpenAI Codex · GPT-5.5 (Stabil & Handal)", engine: "codex", group: "OpenAI Codex Models" },

  // --- Opencode Engine Models ---
  { id: "opencode/mimo-v2.6-flash-free", name: "Opencode · Mimo 2.6 Flash (Free) - Cepat & Lincah", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/nemotron-3.5-lightning-free", name: "Opencode · Nemotron 3.5 Lightning (Free) - Gesit & Ringan", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/ling-3.1-flash-free", name: "Opencode · Ling 3.1 Flash (Free) - Cepat & Akurat", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/longcat-2.5-preview-free", name: "Opencode · Longcat 2.5 Preview (Free) - Konteks Panjang", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/exo-free", name: "Opencode · Exo (Free) - Model Ringkas", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/big-pickle", name: "Opencode · Big Pickle - Analitis", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/space-bunny-free", name: "Opencode · Space Bunny (Free)", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/nemotron-3-ultra-free", name: "Opencode · Nemotron 3 Ultra (Free)", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/muse-spark-1.3-contributor-free", name: "Opencode · Muse Spark 1.3 (Free)", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/fledge-alpha-free", name: "Opencode · Fledge Alpha (Free)", engine: "opencode", group: "Opencode Community Models" },
  { id: "opencode/ling-3.0-flash-fin-free", name: "Opencode · Ling 3.0 Flash Fin (Free)", engine: "opencode", group: "Opencode Community Models" }
];

function isOpencodeModel(model) {
  return typeof model === "string" && (model.startsWith("opencode/") || model.startsWith("opencode:"));
}

function isCodexModel(model) {
  return typeof model === "string" && (
    model.startsWith("codex/") ||
    model.startsWith("codex:") ||
    model === "gpt-6.1-sol" ||
    model === "gpt-6-astra" ||
    model === "gpt-5.6-sol" ||
    model === "gpt-5.5"
  );
}

function getEngineTag(model) {
  if (isCodexModel(model)) return "OpenAI Codex";
  if (isOpencodeModel(model)) return "Opencode";
  return "Unsupported";
}

function resolveModelId(input) {
  if (!input) return null;
  const q = input.trim().toLowerCase();
  const exact = DEFAULT_MODELS.find(m => m.id.toLowerCase() === q);
  if (exact) return exact.id;

  const found = DEFAULT_MODELS.find(m =>
    m.id.toLowerCase().includes(q) ||
    m.name.toLowerCase().includes(q)
  );
  if (found) return found.id;

  return input.trim();
}

function probeEngine(command) {
  try {
    const out = spawnEngineSync(command, ["--version"], {
      encoding: "utf8",
      timeout: 8000,
      cwd: BUDI_WORKSPACE,
      env: {
        ...process.env,
        HOME: USER_HOME,
        USER: "budi",
        WORKSPACE: BUDI_WORKSPACE,
        PATH: RUNTIME_PATH
      }
    });
    const version = String(out.stdout || out.stderr || "").trim().split("\n")[0] || null;
    return {
      ok: !out.error && out.status === 0,
      command,
      version,
      exitCode: typeof out.status === "number" ? out.status : null,
      error: out.error ? out.error.message : null
    };
  } catch (err) {
    return { ok: false, command, version: null, exitCode: null, error: err.message };
  }
}

function getRuntimeHealth() {
  const engines = {
    opencode: probeEngine("opencode"),
    codex: probeEngine("codex")
  };
  return {
    ok: Object.values(engines).every(e => e.ok),
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    host: HOST,
    port: Number(PORT),
    runtimeDir: RUNTIME_DIR,
    workspaces: { budi: BUDI_WORKSPACE, rian: RIAN_WORKSPACE },
    engines
  };
}

// Helper to load persisted data
function loadInitialData() {
  try {
    if (fs.existsSync(CHAT_DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CHAT_DATA_FILE, "utf-8"));
      return parsed;
    }
  } catch (e) {
    console.error("Load initial chat_data error:", e);
  }
  return null;
}

const savedData = loadInitialData() || {};

let state = {
  topic: savedData.topic || "Apakah AI akan menggantikan programmer?",
  modelA: DEFAULT_MODELS.some(m => m.id === savedData.modelA)
    ? savedData.modelA
    : "codex/gpt-6.1-sol",
  modelB: DEFAULT_MODELS.some(m => m.id === savedData.modelB)
    ? savedData.modelB
    : "opencode/nemotron-3-ultra-free",
  isRunning: false,
  isGenerating: false,
  typingWho: null, // "Budi" or "Rian" or null
  typingChatId: null, // "group" or "direct_budi" or "direct_rian"
  nextSpeaker: "A", // 'A' or 'B'
  activeChat: "group",
  chats: savedData.chats || {
    group: [],
    direct_budi: [],
    direct_rian: []
  },
  statuses: savedData.statuses || [
    {
      id: "st-budi-1",
      author: "budi",
      authorName: "Budi (Tech Lead)",
      avatarText: "B",
      avatarBg: "#0288d1",
      type: "text",
      text: "Review arsitektur backend & validasi unit test. Code clean, tim tenang 💻☕",
      bgGradient: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
      timestamp: Date.now() - 3600000,
      timeFormatted: "1 jam lalu"
    },
    {
      id: "st-rian-1",
      author: "rian",
      authorName: "Rian (Developer)",
      avatarText: "R",
      avatarBg: "#f57c00",
      type: "text",
      text: "Kopi sachet kedua hari ini + playlist lo-fi. Gaspol tugas dari Boss Bayu pantang kendor! 🔥🚀",
      bgGradient: "linear-gradient(135deg, #d35400 0%, #e67e22 100%)",
      timestamp: Date.now() - 1800000,
      timeFormatted: "30 menit lalu"
    }
  ],
  calls: savedData.calls || [],
  isStopped: false,
  peerJapriAllowed: false,
  peerJapriRemaining: 0,
  internalPeer: savedData.internalPeer || [],
  contextMemory: savedData.contextMemory || {
    group: "",
    direct_budi: "",
    direct_rian: ""
  },
  fullHistoryRequested: {
    group: false,
    direct_budi: false,
    direct_rian: false
  },
  // Backward compatibility property for cli.js and older clients
  get messages() {
    return this.chats.group;
  },
  set messages(val) {
    this.chats.group = val;
  }
};

function saveChatData() {
  try {
    const dataToSave = {
      topic: state.topic,
      modelA: state.modelA,
      modelB: state.modelB,
      chats: state.chats,
      statuses: state.statuses,
      calls: state.calls,
      internalPeer: state.internalPeer || [],
      contextMemory: state.contextMemory || {
        group: "",
        direct_budi: "",
        direct_rian: ""
      }
    };
    fs.writeFileSync(CHAT_DATA_FILE, JSON.stringify(dataToSave, null, 2));
  } catch (e) {
    console.error("Save chat_data error:", e);
  }
}

let nextTurnTimeout = null;
let pendingUserTurn = false;
const sseClients = new Set();

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function stripAnsi(str) {
  let s = (str || "")
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
    .replace(/<\/?(?:parameter|argument|tool_call|function|call)>/gi, "");

  if (s.includes("</tool_call>")) {
    s = s.split("</tool_call>").pop();
  }
  if (s.includes("</think>")) {
    s = s.split("</think>").pop();
  }

  return s
    .split("\n")
    .filter(line => !/^\s*\**\s*(Waiting for subagent|Running tool|Thinking\.\.\.|Calling tool)/i.test(line))
    .join("\n")
    .trim();
}

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function addSystemMessage(text, chatId = "group") {
  const msg = {
    id: "sys-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    chatId,
    type: "system",
    text,
    time: nowTime()
  };
  if (!state.chats[chatId]) state.chats[chatId] = [];
  state.chats[chatId].push(msg);
  saveChatData();
  broadcastSSE("message", msg);
  return msg;
}

function addChatMessage({ sender, senderName, text, side, model, chatId = "group", quoted = null, type = "chat", duration = null }) {
  const msg = {
    id: "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    chatId: chatId || "group",
    type: type || "chat",
    sender, // 'ai1', 'ai2', 'user'
    senderName, // 'Budi', 'Rian', 'Bayu'
    text,
    side, // 'left' or 'right'
    model: model || null,
    quoted: quoted || null,
    duration: duration || null,
    time: nowTime(),
    ticks: side === "right"
  };
  const targetId = chatId || "group";
  if (!state.chats[targetId]) state.chats[targetId] = [];
  state.chats[targetId].push(msg);
  saveChatData();
  broadcastSSE("message", msg);

  // Auto-compress if chat history becomes large (> 25 messages) to prevent memory overload
  if (state.chats[targetId].length >= 25 && state.chats[targetId].length % 15 === 0) {
    try {
      compressChatContext(targetId);
      console.log(`[Auto-Compaction] Konteks ${targetId} otomatis dipadatkan (panjang: ${state.chats[targetId].length})`);
    } catch (e) {
      console.error("Auto compaction error:", e);
    }
  }

  return msg;
}

function addFileMessage({ sender, senderName, side, filename, storedAs, size, caption, model, chatId = "group" }) {
  const sizeFormatted = typeof size === "number" ? formatBytes(size) : (size || "File");
  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
  const targetId = chatId || "group";
  const msg = {
    id: "file-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    chatId: targetId,
    type: "file",
    sender, // 'ai1', 'ai2', 'user'
    senderName: senderName || (side === "right" ? "Bayu" : "Anggota"),
    side, // 'left' or 'right'
    text: caption || (isImage ? `Mengirim gambar: ${filename}` : `Mengirim file: ${filename}`),
    file: {
      name: filename,
      storedAs: storedAs,
      size: sizeFormatted,
      isImage,
      url: `/api/files/${encodeURIComponent(storedAs)}`
    },
    model: model || null,
    time: nowTime(),
    ticks: side === "right"
  };
  if (!state.chats[targetId]) state.chats[targetId] = [];
  state.chats[targetId].push(msg);
  saveChatData();
  broadcastSSE("message", msg);
  return msg;
}

function setTyping(who, chatId = "group") {
  state.typingWho = who;
  state.typingChatId = who ? (chatId || "group") : null;
  state.isGenerating = !!who;
  broadcastSSE("typing", { typing: !!who, who: who || "", chatId: state.typingChatId });
}

function formatMessageHistoryLine(m) {
  const isUser = m.sender === "user" || m.senderName === "Bayu" || m.senderName === "Kamu";
  const displayName = isUser ? "Boss Bayu (Ketua & Admin)" : m.senderName;
  let quotePrefix = "";
  if (m.quoted && m.quoted.text) {
    const qSender = m.quoted.senderName || "chat";
    quotePrefix = `[Membalas pesan dari ${qSender}: "${m.quoted.text.slice(0, 70)}"] `;
  }
  if (m.type === "file" && m.file) {
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(m.file.name);
    const itemType = isImage ? "gambar/foto" : "file/dokumen";
    return `${displayName}: ${quotePrefix}[Mengirim ${itemType}: ${m.file.name} (${m.file.size})] ${m.text || ""} (Dapat diambil ke workspace: chat-get ${m.file.name})`;
  }
  return `${displayName}: ${quotePrefix}${m.text}`;
}

const STATUS_EXPIRY_MS = 24 * 60 * 60 * 1000;

function formatStatusTime(timestamp) {
  if (!timestamp) return "Baru saja";
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return "Baru saja";
  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(diff / (3600 * 1000));
  if (hours < 24) return `${hours} jam lalu`;
  return "Kedaluwarsa";
}

function cleanupExpiredStatuses() {
  const now = Date.now();
  const initialLen = state.statuses.length;
  state.statuses = state.statuses.filter(s => {
    const ts = typeof s.timestamp === "number" ? s.timestamp : 0;
    return (now - ts) < STATUS_EXPIRY_MS;
  });
  // Update dynamic timeFormatted for all active statuses
  state.statuses.forEach(s => {
    s.timeFormatted = formatStatusTime(s.timestamp);
  });
  if (state.statuses.length !== initialLen) {
    saveChatData();
    broadcastSSE("status_update", { statuses: state.statuses });
  }
}

// Background cleanup every 60 seconds
setInterval(() => {
  cleanupExpiredStatuses();
}, 60000);

function createStatus(author, authorName, text, bgGradient = null, imageUrl = null) {
  cleanupExpiredStatuses();
  const authorGradients = {
    budi: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
    rian: "linear-gradient(135deg, #d35400 0%, #e67e22 100%)",
    user: "linear-gradient(135deg, #075e54 0%, #128c7e 100%)"
  };
  const gradient = bgGradient || authorGradients[author] || "linear-gradient(135deg, #075e54 0%, #128c7e 100%)";

  // Retain only latest active status for that author
  state.statuses = state.statuses.filter(s => s.author !== author);

  const now = Date.now();
  const statusItem = {
    id: `st-${author}-${now}`,
    author,
    authorName: authorName || (author === "user" ? "Boss Bayu" : (author === "budi" ? "Budi (Tech Lead)" : "Rian (Developer Lapangan)")),
    avatarText: author === "user" ? "BY" : (author === "budi" ? "B" : "R"),
    avatarBg: author === "user" ? "#00a884" : (author === "budi" ? "#0077b6" : "#e65100"),
    type: imageUrl ? "image" : "text",
    text: text || "",
    imageUrl: imageUrl || null,
    bgGradient: gradient,
    timestamp: now,
    expiresAt: now + STATUS_EXPIRY_MS,
    timeFormatted: "Baru saja"
  };

  state.statuses.unshift(statusItem);
  saveChatData();
  broadcastSSE("status_update", { statuses: state.statuses, newStatus: statusItem });

  if (author === "user") {
    setTimeout(() => {
      triggerStatusReaction(statusItem);
    }, 3200);
  }

  return statusItem;
}

function getActiveStatusesSummary() {
  cleanupExpiredStatuses();
  const userStatuses = state.statuses.filter(s => s.author === "user");
  const budiStatuses = state.statuses.filter(s => s.author === "budi");
  const rianStatuses = state.statuses.filter(s => s.author === "rian");

  const userText = userStatuses.length ? userStatuses.map(s => `"${s.text || s.caption || 'Foto Status'}"`).join("; ") : "(Belum ada status aktif dalam 24 jam)";
  const budiText = budiStatuses.length ? budiStatuses.map(s => `"${s.text || s.caption || 'Foto Status'}"`).join("; ") : "(Belum ada status aktif dalam 24 jam)";
  const rianText = rianStatuses.length ? rianStatuses.map(s => `"${s.text || s.caption || 'Foto Status'}"`).join("; ") : "(Belum ada status aktif dalam 24 jam)";

  return `=== STATUS WHATSAPP AKTIF SAAT INI (TIMELINE STATUS - EXPIRES 24 JAM) ===
- Status WhatsApp Boss Bayu: ${userText}
- Status WhatsApp Budi: ${budiText}
- Status WhatsApp Rian: ${rianText}
(PANDUAN STATUS WHATSAPP & PENCEGAHAN HALUSINASI:
1. Status WhatsApp otomatis kedaluwarsa dan hilang setelah 24 jam layaknya WhatsApp asli.
2. Kamu BISA melihat status Boss Bayu dan rekanmu di atas secara real-time. Jika Boss Bayu bertanya tentang status beliau atau rekanmu, tanggapi sesuai isi di atas.
3. JIKA BOSS BAYU MENYURUH KAMU MEMBUAT ATAU MEMPERBARUI STATUS ("buat status", "update status", "bikin status"), KAMU DILARANG HANYA MENGKLAIM DI OBROLAN TEKS TANPA MEMBUATNYA SECARA NYATA.
   Kamu WAJIB menyertakan tag di pesanmu: [UPDATE_STATUS: Isi statusmu di sini]
   ATAU jalankan di terminal workspacemu: status-post "Isi statusmu di sini"
   Sistem akan langsung memasang status tersebut ke timeline WhatsApp Boss Bayu secara nyata!)`;
}

function isFullHistoryCommand(text) {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase();
  return (
    /baca\s+(semua|seluruh|lengkap|semuanya|dari awal)\s+(riwayat|chat|percakapan|pesan)/i.test(lower) ||
    /baca\s+(riwayat|chat|percakapan)\s+(dari\s+ujung\s+ke\s+ujung|dari\s+awal|lengkap|seluruhnya|semua)/i.test(lower) ||
    /ingat\s+(semua|seluruh)\s+(riwayat|chat|percakapan)/i.test(lower) ||
    /lihat\s+(semua|seluruh)\s+(riwayat|chat|percakapan)/i.test(lower) ||
    /cek\s+(semua|seluruh)\s+(riwayat|chat|percakapan)/i.test(lower) ||
    /riwayat\s+(dari\s+ujung\s+ke\s+ujung|seluruhnya|lengkap)/i.test(lower) ||
    /baca\s+dari\s+awal/i.test(lower)
  );
}

function getConversationHistory(chatId = "group", limit = 15) {
  const list = state.chats[chatId] || [];
  return list
    .filter((m) => m.type === "chat" || m.type === "file")
    .slice(-limit)
    .map(formatMessageHistoryLine)
    .join("\n");
}

function getSmartConversationHistory(chatId = "group", isFullHistory = false, userQuery = "") {
  const list = (state.chats[chatId] || []).filter(m => m.type === "chat" || m.type === "file");
  if (!list.length) return "";

  // 1. Full history mode IF explicitly ordered by Boss Bayu
  if (isFullHistory) {
    const fullText = list.map(formatMessageHistoryLine).join("\n");
    return `=== SELURUH RIWAYAT OBROLAN LENGKAP DARI AWAL (PERINTAH EKSPLISIT BOSS BAYU) ===
(PERHATIAN: Boss Bayu secara khusus memerintahkan kamu membaca SELURUH riwayat chat dari awal sampai akhir. Pahami seluruh riwayat di bawah ini secara saksama:)
${fullText}`;
  }

  // 2. Default Topic-Aware & Compact Memory Mode (Anti-Overload)
  let result = "";
  const compacted = state.contextMemory && state.contextMemory[chatId];
  if (compacted) {
    result += `=== RINGKASAN MEMORI TERPADAT (HASIL PEMADATAN KONTEKS) ===\n${compacted}\n\n`;
  }

  const limit = 5; // Active sliding window
  const recentSlice = list.slice(-limit);

  // Extract terms from active topic & latest query
  const topicTerms = `${state.topic || ""} ${userQuery || ""}`
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !["dan", "yang", "untuk", "dari", "ini", "itu", "atau", "boss", "bayu", "budi", "rian", "chat", "kamu", "bisa", "tolong"].includes(w));

  const olderMessages = list.slice(0, -limit);
  let relevantOlder = [];

  if (topicTerms.length > 0 && olderMessages.length > 0) {
    const scored = olderMessages.map(m => {
      const textLower = (m.text || "").toLowerCase();
      let score = 0;
      for (const term of topicTerms) {
        if (textLower.includes(term)) score += 1;
      }
      return { msg: m, score };
    }).filter(item => item.score > 0);

    scored.sort((a, b) => b.score - a.score);
    relevantOlder = scored.slice(0, 4).map(item => item.msg);
    relevantOlder.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }

  const combined = [...relevantOlder, ...recentSlice];
  const historyText = combined.map(formatMessageHistoryLine).join("\n");

  result += `=== RIWAYAT OBROLAN SESUAI TOPIK AKTIF ("${state.topic}") ===
(PANDUAN EFISIENSI KONTEKS: Kamu HANYA membaca riwayat yang sesuai topik aktif dan 5 pesan terbaru untuk mencegah context overload. Kamu TIDAK membaca chat dari ujung ke ujung. Jika Boss Bayu ingin kamu membaca seluruh riwayat dari awal, beliau akan memerintahkan: "baca semua riwayat chat".)
${historyText}`;

  return result;
}

function compressChatContext(chatId = "group") {
  const list = (state.chats[chatId] || []).filter(m => m.type === "chat" || m.type === "file");
  if (!list.length) {
    return { success: false, message: "Belum ada riwayat chat untuk dipadatkan.", chatId };
  }

  const chatName = chatId === "group" ? "Grup Tim Proyek" : (chatId === "direct_budi" ? "Japri Budi" : "Japri Rian");
  const msgsToCompact = list.length > 3 ? list.slice(0, -3) : list;

  const keyDirectives = [];
  msgsToCompact.forEach(m => {
    if (m.text) {
      if (m.sender === "user" || m.senderName === "Bayu") {
        keyDirectives.push(`- Arahan Boss Bayu: "${m.text.slice(0, 100)}"`);
      } else if (m.senderName && m.text.length > 15 && !m.text.toLowerCase().startsWith("siap")) {
        keyDirectives.push(`- ${m.senderName}: "${m.text.slice(0, 100)}"`);
      }
    }
  });

  const compactSummary = `[Ringkasan ${chatName} - ${msgsToCompact.length} pesan dipadatkan pada ${nowTime()}]
- Topik Utama: ${state.topic}
- Inti Arahan & Pembahasan Sebelumnya:
${keyDirectives.slice(-8).join("\n") || "- Percakapan berjalan produktif sesuai instruksi Boss Bayu."}
- Status: Memori lama telah dirangkum padat. Obrolan berlanjut pada topik aktif.`;

  state.contextMemory = state.contextMemory || {};
  state.contextMemory[chatId] = compactSummary;
  saveChatData();

  addSystemMessage(`🧠 [Memori Dipadatkan]: Konteks obrolan (${msgsToCompact.length} pesan) telah diringkas secara otomatis oleh sistem. Budi & Rian kini merespons lebih cepat, hemat memori, dan fokus pada topik aktif.`, chatId);

  broadcastSSE("context_compacted", {
    chatId,
    summary: compactSummary,
    compactedCount: msgsToCompact.length
  });

  return {
    success: true,
    summary: compactSummary,
    compactedCount: msgsToCompact.length,
    chatId
  };
}

// Process tracking & stop control
const activeChildProcesses = new Set();
let aiToAiJapriCount = 0;


function executeOpencodeCli(model, prompt, speaker = "A", currentChatId = "group") {
  return new Promise((resolve, reject) => {
    const isA = speaker === "A";
    const workspaceDir = isA ? BUDI_WORKSPACE : RIAN_WORKSPACE;
    const userName = isA ? "budi" : "rian";

    try {
      if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
      }
    } catch {}

    const env = {
      ...process.env,
      GODEBUG: "netdns=cgo",
      HOME: USER_HOME,
      USER: userName,
      WORKSPACE: workspaceDir,
      CURRENT_CHAT_ID: currentChatId || "group",
      PATH: RUNTIME_PATH
    };

    const args = [
      "run",
      "--auto",
      "-m", model,
      "--dir", toAndroidGuestPath(workspaceDir)
    ];

    let stdoutData = "";
    let stderrData = "";
    let isSettled = false;

    const child = spawnEngine("opencode", args, { cwd: workspaceDir, env });
    activeChildProcesses.add(child);

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        activeChildProcesses.delete(child);
        try { child.kill("SIGKILL"); } catch {}
        reject(new Error(`Opencode timeout setelah 180s (model: ${model})`));
      }
    }, 180000);

    child.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    child.on("error", (err) => {
      activeChildProcesses.delete(child);
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    child.on("close", (code) => {
      activeChildProcesses.delete(child);
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      if (code !== 0 && !stdoutData.trim()) {
        const errMsg = (stderrData || `Opencode keluar dengan kode ${code}`).trim();
        const errObj = new Error(errMsg);
        errObj.isQuotaError = /RESOURCE_EXHAUSTED|quota|rate limit|429|exhausted|too many requests|overloaded/i.test(errMsg);
        return reject(errObj);
      }

      let cleanOut = stdoutData.trim();
      if (!cleanOut && stderrData) {
        cleanOut = stderrData
          .split("\n")
          .filter(l => !l.startsWith("> build") && !l.startsWith("← Write") && !l.startsWith("Wrote file") && !l.includes("build ·"))
          .join("\n")
          .trim();
      }
      resolve(cleanOut);
    });

    // Kirim prompt lengkap melalui stdin agar tidak terkena batas panjang argumen OS
    try {
      child.stdin.write(prompt);
      child.stdin.end();
    } catch (e) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        reject(e);
      }
    }
  });
}

function executeCodexCli(model, prompt, speaker = "A", currentChatId = "group") {
  return new Promise((resolve, reject) => {
    const isA = speaker === "A";
    const workspaceDir = isA ? BUDI_WORKSPACE : RIAN_WORKSPACE;
    const userName = isA ? "budi" : "rian";

    try {
      if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
      }
    } catch {}

    const activeCodex = getActiveAuthProfile("codex", speaker);
    const codexHomeDir = (activeCodex && activeCodex.dir && fs.existsSync(activeCodex.dir))
      ? activeCodex.dir
      : DEFAULT_CODEX_HOME;

    const env = {
      ...process.env,
      GODEBUG: "netdns=cgo",
      HOME: USER_HOME,
      USER: userName,
      WORKSPACE: workspaceDir,
      CURRENT_CHAT_ID: currentChatId || "group",
      CODEX_HOME: codexHomeDir,
      PATH: RUNTIME_PATH
    };

    const tempOutFile = IS_ANDROID_RUNTIME
      ? path.join(RUNTIME_DIR, "tmp", `codex_out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`)
      : path.join("/tmp", `codex_out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    try { fs.mkdirSync(path.dirname(tempOutFile), { recursive: true }); } catch {}
    const codexWorkspaceArg = toAndroidGuestPath(workspaceDir);
    const codexOutArg = toAndroidGuestPath(tempOutFile);
    const codexModelName = (model || "").replace(/^codex[\/:]/, "") || "gpt-6.1-sol";

    const args = [
      "--approve-for-me",
      ...(IS_ANDROID_RUNTIME ? ["--sandbox", "danger-full-access"] : []),
      "exec",
      "--skip-git-repo-check",
      "-m", codexModelName,
      "-C", codexWorkspaceArg,
      "-o", codexOutArg,
      "-"
    ];

    let stdoutData = "";
    let stderrData = "";
    let isSettled = false;

    const child = spawnEngine("codex", args, { cwd: workspaceDir, env });
    activeChildProcesses.add(child);

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        activeChildProcesses.delete(child);
        try { child.kill("SIGKILL"); } catch {}
        try { if (fs.existsSync(tempOutFile)) fs.unlinkSync(tempOutFile); } catch {}
        reject(new Error(`Codex timeout setelah 180s (model: ${model})`));
      }
    }, 180000);

    child.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    child.on("error", (err) => {
      activeChildProcesses.delete(child);
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        try { if (fs.existsSync(tempOutFile)) fs.unlinkSync(tempOutFile); } catch {}
        reject(err);
      }
    });

    child.on("close", (code) => {
      activeChildProcesses.delete(child);
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      let resultText = "";
      try {
        if (fs.existsSync(tempOutFile)) {
          resultText = fs.readFileSync(tempOutFile, "utf-8").trim();
          fs.unlinkSync(tempOutFile);
        }
      } catch {}

      if (!resultText) {
        const match = stdoutData.match(/(?:codex\n)([\s\S]*?)(?:\ntokens used|$)/i);
        resultText = match ? match[1].trim() : stdoutData.trim();
      }

      if (code !== 0 && !resultText) {
        const errMsg = (stderrData || stdoutData || `Codex keluar dengan kode ${code}`).trim();
        const errObj = new Error(errMsg);
        errObj.isQuotaError = /RESOURCE_EXHAUSTED|quota|rate limit|429|exhausted|too many requests|overloaded|usage limit/i.test(errMsg);
        return reject(errObj);
      }

      resolve(resultText || "...");
    });

    try {
      child.stdin.write(prompt);
      child.stdin.end();
    } catch (e) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        try { if (fs.existsSync(tempOutFile)) fs.unlinkSync(tempOutFile); } catch {}
        reject(e);
      }
    }
  });
}

// Strict model execution: Tidak menggunakan cascading auto-fallback.
// Model yang dipilih Boss Bayu akan dijalankan apa adanya tanpa dialihkan ke model lain secara diam-diam.
async function callAgent(preferredModel, prompt, speaker = "A", currentChatId = "group") {
  const isCodex = isCodexModel(preferredModel);
  const isOpencode = isOpencodeModel(preferredModel);

  if (isCodex) {
    return await executeCodexCli(preferredModel, prompt, speaker, currentChatId);
  } else if (isOpencode) {
    return await executeOpencodeCli(preferredModel, prompt, speaker, currentChatId);
  } else {
    throw new Error(`Model tidak didukung oleh engine aplikasi: ${preferredModel}. Pilih OpenAI Codex atau OpenCode.`);
  }
}


// Handle auto file sending tag from AI: [KIRIM_FILE: filename caption] or mentioned files in workspace
function processFileTags(cleanText, workspaceDir, isA, speakerName, model, chatId) {
  const sentFiles = new Set();

  const sendFileFromWorkspace = (fileName, caption) => {
    if (sentFiles.has(fileName.toLowerCase())) return;
    // Skip if this file was already posted to this chat by this sender in the last 10 minutes (e.g. via chat-send CLI)
    const recentList = (state.chats[chatId] || []).slice(-15);
    const senderId = isA ? "ai1" : "ai2";
    const alreadySent = recentList.some(m =>
      m.type === "file" && m.sender === senderId && m.file &&
      m.file.name.toLowerCase() === fileName.toLowerCase() &&
      (Date.now() - parseInt(String(m.id).split("-")[1] || "0", 10)) < 10 * 60 * 1000
    );
    if (alreadySent) {
      sentFiles.add(fileName.toLowerCase());
      return;
    }
    const localFilePath = path.join(workspaceDir, fileName);
    if (!fs.existsSync(localFilePath)) return;

    try {
      const stat = fs.statSync(localFilePath);
      if (!stat.isFile()) return;

      const storedAs = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const destPath = path.join(CHAT_FILES_DIR, storedAs);
      fs.copyFileSync(localFilePath, destPath);

      const record = {
        id: "file-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        filename: fileName,
        storedAs,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        sender: isA ? "ai1" : "ai2",
        senderName: speakerName,
        caption: caption || `Mengirim file: ${fileName}`,
        chatId,
        timestamp: new Date().toISOString(),
        time: nowTime()
      };

      let list = [];
      try {
        if (fs.existsSync(CHAT_INDEX_FILE)) {
          list = JSON.parse(fs.readFileSync(CHAT_INDEX_FILE, "utf-8") || "[]");
        }
      } catch {}
      list.push(record);
      fs.writeFileSync(CHAT_INDEX_FILE, JSON.stringify(list, null, 2));

      addFileMessage({
        sender: isA ? "ai1" : "ai2",
        senderName: speakerName,
        side: "left",
        filename: fileName,
        storedAs,
        size: stat.size,
        caption: record.caption,
        model,
        chatId
      });

      sentFiles.add(fileName.toLowerCase());
    } catch (e) {
      console.error("Auto file send error:", e);
    }
  };

  // 1. Handle explicit status tags: [UPDATE_STATUS: ...] / [STATUS: ...] / [BUAT_STATUS: ...]
  const statusTagMatches = [...cleanText.matchAll(/\[(?:UPDATE_STATUS|STATUS|BUAT_STATUS):\s*([^\]]+)\]/gi)];
  for (const m of statusTagMatches) {
    const statusContent = m[1].trim();
    cleanText = cleanText.replace(m[0], "").trim();
    if (statusContent) {
      createStatus(isA ? "budi" : "rian", isA ? "Budi (Tech Lead)" : "Rian (Developer Lapangan)", statusContent);
    }
  }

  // Smart fallback: If speaker announced updating status in quotes without tag
  if (statusTagMatches.length === 0) {
    const statusQuoteMatch = cleanText.match(/(?:status(?:\s+WhatsApp)?(?:\s+saya)?(?:\s+(?:perbarui|baru|jadi))?[:\s]+)(?:["“\*]+)([^"”\*]+)(?:["”\*]+)/i);
    if (statusQuoteMatch && statusQuoteMatch[1] && statusQuoteMatch[1].length > 4 && statusQuoteMatch[1].length < 200) {
      const detectedStatus = statusQuoteMatch[1].trim();
      createStatus(isA ? "budi" : "rian", isA ? "Budi (Tech Lead)" : "Rian (Developer Lapangan)", detectedStatus);
    }
  }

  // 2. Handle explicit [KIRIM_FILE: filename caption] tags
  const fileTagMatches = [...cleanText.matchAll(/\[KIRIM_FILE:\s*([^\s\]]+)(?:\s+([^\]]+))?\]/gi)];
  for (const m of fileTagMatches) {
    const fileName = m[1];
    const caption = m[2] || `Mengirim file: ${fileName}`;
    cleanText = cleanText.replace(m[0], "").trim();
    sendFileFromWorkspace(fileName, caption);
  }

  // 3. Automatically detect files mentioned in backticks that exist in workspace
  const mentioned = [...cleanText.matchAll(/`([a-zA-Z0-9_\-]+\.(?:jpg|jpeg|png|gif|webp|svg|html|zip|pdf|txt|csv|py|js|json|sh|css))`(?:\s*\(|\b)?/gi)];
  for (const m of mentioned) {
    const fn = m[1];
    if (fn.toLowerCase() === "package.json" || fn.toLowerCase() === "readme.md") continue;
    sendFileFromWorkspace(fn, `Mengirim file: ${fn}`);
  }

  // 4. Handle cross-chat tags: [KIRIM_KE_GRUP: ...] or [KIRIM_CHAT: <chatId> ...]
  const groupTagMatches = [...cleanText.matchAll(/\[KIRIM_KE_GRUP:\s*([^\]]+)\]/gi)];
  for (const m of groupTagMatches) {
    const postText = m[1].trim();
    cleanText = cleanText.replace(m[0], "").trim();
    if (postText) {
      addChatMessage({
        sender: isA ? "ai1" : "ai2",
        senderName: speakerName,
        text: postText,
        side: "left",
        model,
        chatId: "group"
      });
      state.nextSpeaker = isA ? "B" : "A";
      scheduleNextTurn(1200, true);
    }
  }

  const crossChatMatches = [...cleanText.matchAll(/\[KIRIM_CHAT:\s*([a-zA-Z0-9_\-]+)\s+([^\]]+)\]/gi)];
  for (const m of crossChatMatches) {
    const targetChat = m[1].trim();
    const postText = m[2].trim();
    cleanText = cleanText.replace(m[0], "").trim();
    if (postText && targetChat) {
      if (targetChat === "group") {
        addChatMessage({
          sender: isA ? "ai1" : "ai2",
          senderName: speakerName,
          text: postText,
          side: "left",
          model,
          chatId: "group"
        });
        if (!state.isStopped) {
          state.nextSpeaker = isA ? "B" : "A";
          scheduleNextTurn(1200, true);
        }
      } else {
        // Any peer-to-peer / direct message between Budi & Rian MUST go to internalPeer!
        // Never leak into Boss Bayu's private chats (direct_budi / direct_rian)!
        if (!state.isStopped) {
          if (!state.peerJapriAllowed || state.peerJapriRemaining <= 0) {
            console.warn(`[Japri Rejected] ${speakerName} mencoba japri internal tanpa perintah eksplisit Boss Bayu.`);
            continue;
          }
          state.peerJapriRemaining--;
          if (state.peerJapriRemaining <= 0) {
            state.peerJapriAllowed = false;
          }
          const peerMsg = {
            id: "peer-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
            sender: isA ? "ai1" : "ai2",
            senderName: speakerName,
            text: postText,
            time: nowTime(),
            timestamp: new Date().toISOString()
          };
          if (!state.internalPeer) state.internalPeer = [];
          state.internalPeer.push(peerMsg);
          saveChatData();
          broadcastSSE("internal_peer", peerMsg);
          if (state.peerJapriAllowed) {
            setTimeout(() => { if (!state.isStopped && state.peerJapriAllowed) runPeerTurn(isA ? "B" : "A"); }, 800);
          }
        }
      }
    }
  }

  // 5. Handle dedicated backend japri tags: [JAPRI_PEER: ...], [JAPRI_BUDI: ...], [JAPRI_RIAN: ...]
  const peerTagMatches = [...cleanText.matchAll(/\[(?:JAPRI_PEER|JAPRI_BUDI|JAPRI_RIAN):\s*([^\]]+)\]/gi)];
  for (const m of peerTagMatches) {
    const postText = m[1].trim();
    cleanText = cleanText.replace(m[0], "").trim();
    if (postText && !state.isStopped) {
      if (!state.peerJapriAllowed || state.peerJapriRemaining <= 0) {
        console.warn(`[Japri Rejected] ${speakerName} mencoba japri internal tanpa perintah eksplisit Boss Bayu.`);
        continue;
      }
      state.peerJapriRemaining--;
      if (state.peerJapriRemaining <= 0) {
        state.peerJapriAllowed = false;
      }
      const peerMsg = {
        id: "peer-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        sender: isA ? "ai1" : "ai2",
        senderName: speakerName,
        text: postText,
        time: nowTime(),
        timestamp: new Date().toISOString()
      };
      if (!state.internalPeer) state.internalPeer = [];
      state.internalPeer.push(peerMsg);
      saveChatData();
      broadcastSSE("internal_peer", peerMsg);
      if (state.peerJapriAllowed) {
        setTimeout(() => { if (!state.isStopped && state.peerJapriAllowed) runPeerTurn(isA ? "B" : "A"); }, 800);
      }
    }
  }

  // 5. Handle Voice Note / Pesan Suara tag: [PESAN_SUARA: ...] or [VOICE_NOTE: ...]
  const vnTagMatches = [...cleanText.matchAll(/\[(?:PESAN_SUARA|VOICE_NOTE):\s*([^\]]+)\]/gi)];
  for (const m of vnTagMatches) {
    const vnContent = m[1].trim();
    cleanText = cleanText.replace(m[0], "").trim();
    if (vnContent) {
      const words = vnContent.split(/\s+/).length;
      const seconds = Math.min(60, Math.max(3, Math.round(words * 0.45)));
      const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
      const secs = String(seconds % 60).padStart(2, "0");
      const durationStr = `${mins}:${secs}`;

      addChatMessage({
        sender: isA ? "ai1" : "ai2",
        senderName: speakerName,
        text: vnContent,
        side: "left",
        model,
        chatId,
        type: "voice_note",
        duration: durationStr
      });
    }
  }

  return cleanText;
}

// Turn in GROUP CHAT
async function runSingleTurn(speaker) {
  if (state.isGenerating) return;

  const isA = speaker === "A";
  const speakerName = isA ? "Budi" : "Rian";
  const personaFile = isA ? PERSONA_A_PATH : PERSONA_B_PATH;
  const model = isA ? state.modelA : state.modelB;
  const workspaceDir = isA ? BUDI_WORKSPACE : RIAN_WORKSPACE;
  const directChatId = isA ? "direct_budi" : "direct_rian";

  let personaContent = "";
  try {
    personaContent = fs.readFileSync(personaFile, "utf-8");
  } catch (err) {
    personaContent = `Kamu adalah ${speakerName}, manusia di grup chat WhatsApp bersama teman-temanmu.`;
  }

  // Check if Boss Bayu explicitly commanded full history read or topic-focused read
  const recentGroupMsgs = state.chats.group || [];
  const lastUserMsg = recentGroupMsgs.filter(m => m.sender === "user").slice(-1)[0];
  const userText = lastUserMsg ? (lastUserMsg.text || "") : "";
  const isFullHist = !!state.fullHistoryRequested.group || isFullHistoryCommand(userText);
  state.fullHistoryRequested.group = false;

  const groupHistory = getSmartConversationHistory("group", isFullHist, userText);
  const directSnippet = getConversationHistory(directChatId, 3);
  const crossMemory = directSnippet ? `\n=== MEMORI JAPRI TERAKHIRMU DENGAN BOSS BAYU ===\n${directSnippet}\n(Gunakan memori ini jika relevan untuk menjaga konsistensi konteks dengan Boss Bayu.)\n` : "";

  let quoteNotice = "";
  if (lastUserMsg && lastUserMsg.quoted && lastUserMsg.quoted.text) {
    quoteNotice = `\n🔔 PERHATIAN BALASAN KHUSUS (QUOTED REPLY): Boss Bayu secara khusus membalas/mengutip pesan dari ${lastUserMsg.quoted.senderName || 'chat'}: "${lastUserMsg.quoted.text}". Wajib tanggapi secara langsung dan presisi isi kutipan tersebut!\n`;
  }

  const prompt = `${personaContent}

=== TOPIK OBROLAN GRUP WHATSAPP ===
${state.topic}

=== STATUS & HIERARKI ANGGOTA GRUP ===
- Nama Ketua Tim & Admin Grup adalah: **Bayu**.
- Kamu WAJIB memanggil beliau dengan sebutan: **"Boss Bayu"**, atau terkadang **"Pak Boss"** atau **"Pak Ketua"**.
- Kamu (${speakerName}) adalah anggota grup yang sangat menghormati, patuh, dan loyal pada arahan Boss Bayu.
- Boss Bayu bisa mengirimkan pesan teks, gambar (foto/screenshot/diagram), file kode program, atau dokumen ke grup ini.
- Setiap instruksi, tugas, atau gambar/file dari Boss Bayu harus selalu kamu jawab dan tanggapi dengan penuh hormat, patuh, dan sigap.
${crossMemory}${quoteNotice}
=== RIWAYAT OBROLAN TERAKHIR DI GRUP ===
${groupHistory || "(Belum ada obrolan, kamu pembuka percakapan pertama di grup ini.)"}

${getActiveStatusesSummary()}

=== TUGAS (${speakerName}) ===
Tulis 1 pesan tanggapanmu (2-4 kalimat) di grup WhatsApp ini. Bicaralah wajar dan natural seperti manusia di grup chat WhatsApp yang sangat menghormati dan patuh pada Boss Bayu. Tanggapi apa yang baru saja dikatakan di riwayat obrolan di atas (utamakan merespons arahan, pertanyaan, atau file/gambar dari Boss Bayu). Jika Boss Bayu meminta mengecek file/gambar, coding, riset, atau browsing, gunakan tools terminalmu di workspace untuk melaksanakannya. Langsung tuliskan isi pesanmu tanpa awalan "${speakerName}:".`;

  setTyping(speakerName, "group");

  try {
    const response = await callAgent(model, prompt, speaker, "group");
    setTyping(null, "group");

    let cleanText = stripAnsi(response);
    cleanText = cleanText.replace(new RegExp(`^(\\*\\*|\\*)?${speakerName}(\\*\\*|\\*)?\\s*:\\s*`, "i"), "").trim();
    if (!cleanText) cleanText = "...";

    cleanText = processFileTags(cleanText, workspaceDir, isA, speakerName, model, "group");

    if (cleanText) {
      addChatMessage({
        sender: isA ? "ai1" : "ai2",
        senderName: speakerName,
        text: cleanText,
        side: "left",
        model,
        chatId: "group"
      });
    }

    state.nextSpeaker = isA ? "B" : "A";

    if (pendingUserTurn) {
      pendingUserTurn = false;
      scheduleNextTurn(1200, true);
    } else if (state.isRunning) {
      scheduleNextTurn(3000);
    }
  } catch (err) {
    console.error(`Error generating response from ${speakerName}:`, err);
    setTyping(null, "group");
    addSystemMessage(`⚠️ Gagal memanggil ${speakerName} (${model}): ${err.message}`, "group");

    if (state.isRunning) {
      scheduleNextTurn(5000);
    }
  }
}

let pendingDirectQueue = [];

// Turn in DIRECT CHAT (Japri 1-on-1 dengan Boss Bayu)
async function runDirectTurn(speaker, targetChatId) {
  if (state.isStopped) return;
  if (state.isGenerating) {
    if (!pendingDirectQueue.some(item => item.targetChatId === targetChatId)) {
      pendingDirectQueue.push({ speaker, targetChatId });
    }
    return;
  }

  const isA = speaker === "A";
  const speakerName = isA ? "Budi" : "Rian";
  const personaFile = isA ? PERSONA_A_PATH : PERSONA_B_PATH;
  const model = isA ? state.modelA : state.modelB;
  const workspaceDir = isA ? BUDI_WORKSPACE : RIAN_WORKSPACE;

  let personaContent = "";
  try {
    personaContent = fs.readFileSync(personaFile, "utf-8");
  } catch (err) {
    personaContent = `Kamu adalah ${speakerName}, programmer manusia teman kerja Boss Bayu.`;
  }

  const recentDirectMsgs = state.chats[targetChatId] || [];
  const lastUserMsgDirect = recentDirectMsgs.filter(m => m.sender === "user").slice(-1)[0];
  const userTextDirect = lastUserMsgDirect ? (lastUserMsgDirect.text || "") : "";
  const isFullHistDirect = !!state.fullHistoryRequested[targetChatId] || isFullHistoryCommand(userTextDirect);
  state.fullHistoryRequested[targetChatId] = false;

  const directHistory = getSmartConversationHistory(targetChatId, isFullHistDirect, userTextDirect);
  const groupRecent = getSmartConversationHistory("group", false, userTextDirect);

  let quoteNoticeDirect = "";
  if (lastUserMsgDirect && lastUserMsgDirect.quoted && lastUserMsgDirect.quoted.text) {
    quoteNoticeDirect = `\n🔔 PERHATIAN BALASAN JAPRI (QUOTED REPLY): Boss Bayu secara khusus membalas/mengutip pesan dari ${lastUserMsgDirect.quoted.senderName || 'chat'}: "${lastUserMsgDirect.quoted.text}". Wajib tanggapi langsung pesan yang dikutip ini!\n`;
  }

  const roleInstruction = isA
    ? `Kamu sedang berbicara 1-on-1 (JAPRI PRIBADI) di WhatsApp dengan Boss Bayu. Beliau adalah Ketua Tim & Admin yang sangat kamu segani dan patuhi. Di japri ini, kamu memberikan konsultasi teknis yang jelas, sopan, mendalam, dan patuh pada arahan beliau.`
    : `Kamu sedang ngobrol santai 1-on-1 (JAPRI PRIBADI) di WhatsApp dengan Boss Bayu. Kamu sangat loyal, setia, dan patuh pada arahan Pak Boss. Di japri ini, kamu bicara lebih santai ala tongkrongan, guyon, antusias, atau lapor progres kodingan lapangan secara langsung ke Boss Bayu.`;

  const prompt = `${personaContent}

=== KONTEKS CHAT PRIBADI (JAPRI) DENGAN BOSS BAYU ===
${roleInstruction}
${quoteNoticeDirect}

=== CROSS-CONTEXT MEMORY (RIWAYAT TERAKHIR DI GRUP TIM PROYEK) ===
Berikut adalah obrolan terakhir di grup WhatsApp tim kita bersama Boss Bayu:
${groupRecent || "(Grup masih sepi)"}
(CATATAN PENTING: Kamu mengingat apa pun yang dibahas di grup di atas! Jika Boss Bayu membicarakan topik, tugas, file, atau rencana di grup, kamu sangat paham dan konteks tidak terpotong.)

=== RIWAYAT CHAT PRIBADI (JAPRI) INI ===
${directHistory || "(Ini obrolan japri pertama antara kamu dan Boss Bayu)"}

${getActiveStatusesSummary()}

=== TUGAS (${speakerName}) ===
Tulis 1 pesan balasan japri (1-3 kalimat) kepada Boss Bayu secara responsif, wajar, dan natural layaknya di WhatsApp pribadi. Langsung tuliskan isi pesanmu tanpa awalan "${speakerName}:".`;

  setTyping(speakerName, targetChatId);

  try {
    const response = await callAgent(model, prompt, speaker, targetChatId);
    setTyping(null, targetChatId);

    let cleanText = stripAnsi(response);
    cleanText = cleanText.replace(new RegExp(`^(\\*\\*|\\*)?${speakerName}(\\*\\*|\\*)?\\s*:\\s*`, "i"), "").trim();
    if (!cleanText) cleanText = "...";

    cleanText = processFileTags(cleanText, workspaceDir, isA, speakerName, model, targetChatId);

    if (cleanText && !state.isStopped) {
      addChatMessage({
        sender: isA ? "ai1" : "ai2",
        senderName: speakerName,
        text: cleanText,
        side: "left",
        model,
        chatId: targetChatId
      });
    }
  } catch (err) {
    console.error(`Error in direct turn for ${speakerName}:`, err);
    setTyping(null, targetChatId);
    addSystemMessage(`⚠️ Gagal membalas japri: ${err.message}`, targetChatId);
  } finally {
    setTyping(null, targetChatId);
    if (!state.isStopped && pendingDirectQueue.length > 0) {
      const nextTurn = pendingDirectQueue.shift();
      setTimeout(() => { if (!state.isStopped) runDirectTurn(nextTurn.speaker, nextTurn.targetChatId); }, 500);
    }
  }
}

let pendingPeerQueue = [];
let peerTurnCount = 0;

// Turn in INTERNAL BACKEND PEER CHAT (Japri antar-rekan di jalur backend)
async function runPeerTurn(speaker) {
  if (state.isStopped || !state.peerJapriAllowed) return;
  if (state.isGenerating) {
    if (!pendingPeerQueue.includes(speaker)) pendingPeerQueue.push(speaker);
    return;
  }

  const isA = speaker === "A";
  const speakerName = isA ? "Budi" : "Rian";
  const otherName = isA ? "Rian" : "Budi";
  const personaFile = isA ? PERSONA_A_PATH : PERSONA_B_PATH;
  const model = isA ? state.modelA : state.modelB;
  const workspaceDir = isA ? BUDI_WORKSPACE : RIAN_WORKSPACE;

  let personaContent = "";
  try {
    personaContent = fs.readFileSync(personaFile, "utf-8");
  } catch (err) {
    personaContent = `Kamu adalah ${speakerName}.`;
  }

  const peerRecent = (state.internalPeer || []).slice(-8)
    .map(m => `[${m.time || ""}] ${m.senderName}: ${m.text}`)
    .join("\n");
  const groupRecent = getConversationHistory("group", 4);

  const prompt = `${personaContent}

=== JALUR KOMUNIKASI BACKEND INTERNAL (PEER-TO-PEER ANTAR REKAN) ===
Kamu sedang berkoordinasi langsung dengan rekanmu, **${otherName}**, melalui JALUR BACKEND INTERNAL (bukan di chat pribadi Boss Bayu).
Kalian berdiskusi teknis, pembagian tugas, atau investigasi kode bersama.

ATURAN MUTLAK:
- Boss Bayu adalah Pemimpin & Ketua Tim. Jika Boss Bayu memberi instruksi STOP, koordinasi ini WAJIB langsung berhenti seketika.
- Tulis balasan teknis yang ringkas, jelas, dan profesional untuk ${otherName} (1-3 kalimat).
- Langsung tulis isi pesanmu tanpa awalan "${speakerName}:".

=== RIWAYAT CHAT JALUR BACKEND TERAKHIR ANTARA KAMU & ${otherName.toUpperCase()} ===
${peerRecent || "(Belum ada obrolan backend sebelumnya)"}

=== TOPIK DI GRUP UTAMA ===
${groupRecent || "(Grup sepi)"}

=== TUGAS (${speakerName}) ===
Tulis balasan untuk ${otherName} di jalur backend:`;

  state.isGenerating = true;
  broadcastSSE("status", getPublicStatus());

  try {
    const response = await callAgent(model, prompt, speaker, "internal_peer");
    let cleanText = stripAnsi(response);
    cleanText = cleanText.replace(new RegExp(`^(\\*\\*|\\*)?${speakerName}(\\*\\*|\\*)?\\s*:\\s*`, "i"), "").trim();
    if (!cleanText) cleanText = "...";

    cleanText = cleanText.replace(/\[(?:JAPRI_PEER|JAPRI_BUDI|JAPRI_RIAN):\s*[^\]]+\]/gi, "").trim();

    const msg = {
      id: "peer-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      sender: isA ? "ai1" : "ai2",
      senderName: speakerName,
      text: cleanText,
      model,
      time: nowTime(),
      timestamp: new Date().toISOString()
    };

    if (!state.internalPeer) state.internalPeer = [];
    state.internalPeer.push(msg);
    saveChatData();
    broadcastSSE("internal_peer", msg);

    // Limit automated ping-pong to max 2 turns without Boss's command
    if (peerTurnCount < 2 && !state.isStopped && state.peerJapriAllowed) {
      peerTurnCount++;
      setTimeout(() => {
        if (!state.isStopped && state.peerJapriAllowed) runPeerTurn(isA ? "B" : "A");
      }, 1500);
    } else {
      peerTurnCount = 0;
      state.peerJapriAllowed = false;
    }
  } catch (err) {
    console.error(`Error in peer turn for ${speakerName}:`, err);
  } finally {
    state.isGenerating = false;
    broadcastSSE("status", getPublicStatus());
    if (pendingPeerQueue.length > 0 && !state.isStopped && state.peerJapriAllowed) {
      const nextSpeaker = pendingPeerQueue.shift();
      setTimeout(() => { if (!state.isStopped && state.peerJapriAllowed) runPeerTurn(nextSpeaker); }, 500);
    }
  }
}

// Turn during PHONE / VIDEO CALL (Web Speech conversation)
async function runPhoneTurn(speaker, spokenText, callId) {
  const isA = speaker === "A";
  const speakerName = isA ? "Budi" : "Rian";
  const model = isA ? state.modelA : state.modelB;
  const directChatId = isA ? "direct_budi" : "direct_rian";

  const directRecent = getConversationHistory(directChatId, 4);
  const groupRecent = getConversationHistory("group", 4);

  const prompt = `Kamu adalah ${speakerName}, seorang developer handal yang sangat loyal, hormat, dan patuh kepada Boss Bayu (Ketua Tim).
Saat ini kamu SEDANG TERHUBUNG DI PANGGILAN TELEPON WHATSAPP (Voice/Video Call) dengan Boss Bayu.

Boss Bayu baru saja berbicara di telepon: "${spokenText}"

Konteks obrolan grup baru-baru ini:
${groupRecent}

Tugas:
Jawab langsung melalui suara telepon dengan 1-2 kalimat lisan pendek, natural, sopan/santai sesuai gayamu (${isA ? "Budi: formal-sopan, analitis" : "Rian: santai, antusias, siap gaspol"}).
DILARANG menggunakan bullet points, markdown bold (*), emotikon berlebihan, atau format koding karena jawabanmu akan disuarakan langsung oleh Speech Synthesizer telepon! Langsung tuliskan ucapanmu.`;

  try {
    const response = await callAgent(model, prompt, speaker);
    let cleanText = stripAnsi(response).trim();
    cleanText = cleanText.replace(new RegExp(`^(\\*\\*|\\*)?${speakerName}(\\*\\*|\\*)?\\s*:\\s*`, "i"), "").trim();
    cleanText = cleanText.replace(/[*#`_~\[\]]/g, "").trim();
    if (!cleanText) cleanText = isA ? "Siap Boss Bayu, instruksi diterima." : "Siap Boss, langsung saya gas!";
    return cleanText;
  } catch (e) {
    console.error("Phone speech error:", e);
    return isA ? "Halo Boss Bayu, suara saya agak putus-putus nih, tapi saya dengar instruksi Pak Boss." : "Halo Pak Boss! Aman, siap laksanakan!";
  }
}

// AI Spontaneously reacting to Boss Bayu's Status Story via Japri
async function triggerStatusReaction(statusStory) {
  // Randomly choose Budi or Rian, or alternate
  const pickA = Math.random() > 0.5;
  const speaker = pickA ? "A" : "B";
  const speakerName = pickA ? "Budi" : "Rian";
  const targetChatId = pickA ? "direct_budi" : "direct_rian";
  const model = pickA ? state.modelA : state.modelB;

  const prompt = `Kamu adalah ${speakerName}, programmer manusia yang berteman di WhatsApp dengan Boss Bayu (Ketua Tim yang kamu hormati).
Boss Bayu baru saja mengunggah Status WhatsApp:
"${statusStory.text || statusStory.caption || 'Mengunggah status baru'}"

Sebagai anggota tim yang melihat status Pak Boss di timeline WhatsApp, kirimkan 1 pesan japri singkat (1-2 kalimat) untuk menanggapi status beliau secara wajar (${pickA ? "Budi: apresiatif, sopan, sedikit sentuhan teknis" : "Rian: santai, guyon, kocak, memuji Pak Boss"}).
Langsung tuliskan isi pesanmu tanpa awalan nama.`;

  try {
    const response = await callAgent(model, prompt, speaker);
    let cleanText = stripAnsi(response).trim();
    cleanText = cleanText.replace(new RegExp(`^(\\*\\*|\\*)?${speakerName}(\\*\\*|\\*)?\\s*:\\s*`, "i"), "").trim();
    if (cleanText) {
      addChatMessage({
        sender: pickA ? "ai1" : "ai2",
        senderName: speakerName,
        text: cleanText,
        side: "left",
        model,
        chatId: targetChatId,
        quoted: {
          type: "status",
          text: statusStory.text || statusStory.caption || "Status Boss Bayu"
        }
      });
    }
  } catch (e) {
    console.error("Status reaction error:", e);
  }
}

function scheduleNextTurn(delayMs = 3000, forceOneTurn = false) {
  if (nextTurnTimeout) {
    clearTimeout(nextTurnTimeout);
    nextTurnTimeout = null;
  }
  if (state.isStopped) return;
  if (!state.isRunning && !forceOneTurn) return;

  nextTurnTimeout = setTimeout(() => {
    nextTurnTimeout = null;
    if (state.isStopped) return;
    if (!state.isRunning && !forceOneTurn) return;
    runSingleTurn(state.nextSpeaker);
  }, delayMs);
}

function handleStart(chatId = null) {
  state.isRunning = true;
  state.isStopped = false;
  state.peerJapriAllowed = false;
  state.peerJapriRemaining = 0;
  pendingUserTurn = false;
  peerTurnCount = 0;
  aiToAiJapriCount = 0;
  if (nextTurnTimeout) clearTimeout(nextTurnTimeout);

  const targetRoom = chatId || "group";
  addSystemMessage("▶️ Aktivitas chat & diskusi dimulai. Ketik /stop atau kirim perintah stop untuk berhenti.", targetRoom);
  broadcastSSE("status", getPublicStatus());

  if (!state.isGenerating) {
    scheduleNextTurn(800);
  }
}

function isStopCommand(text) {
  if (!text || typeof text !== "string") return false;
  const t = text.trim().toLowerCase().replace(/[!.,?]+$/, "").trim();
  if (/^\/(?:stop|st|pause|halt|cancel)$/i.test(t)) return true;
  if (/^(?:stop|berhenti|cukup|tahan|pause|diam|batal|selesai)$/i.test(t)) return true;
  if (/^(?:stop|berhenti|tahan|cukup)\s+(?:dulu|aja|pekerjaanmu|kodingan|chat|japri|japrian|diskusi|kalian|semua|budi|rian)/i.test(t)) return true;
  if (/^(?:budi|rian|kalian)\s*,?\s*(?:stop|berhenti|tahan|cukup|diam|jangan)/i.test(t)) return true;
  if (/^(?:jangan\s+(?:chat|japri|ngobrol|lanjut|kirim))/i.test(t)) return true;
  return false;
}

function isPeerJapriCommand(text) {
  if (!text || typeof text !== "string") return false;
  const t = text.toLowerCase().trim();
  const patterns = [
    /\bjapri\b/i, // any explicit mention of japri ("japri dia", "japri budi", "japri rian", "coba japri", "japri aja")
    /\bajak\s+(?:(?:dia|si\s+\w+)\s+)?(?:ke\s+chat|chat|ngobrol|diskusi)\b/i, // "ajak ke chat", "ajak dia chat", "ajak ngobrol", etc.
    /\bkoordinasi\s+(?:sama|dengan)\b/i, // "koordinasi sama / dengan"
    /\btanya\s+(?:si\s+)?(?:rian|budi)\b/i, // "tanya rian", "tanya budi"
    /\bhubungi\s+(?:si\s+)?(?:rian|budi|dia)\b/i, // "hubungi si budi", "hubungi dia"
    /\bchat\s+(?:si\s+)?(?:rian|budi|dia)\b/i, // "chat si budi", "chat dia"
    /\bngobrol\s+(?:sama|dengan)\s+(?:si\s+)?(?:rian|budi|dia)\b/i, // "ngobrol sama budi"
    /\bdiskusi\s+(?:sama|dengan)\s+(?:si\s+)?(?:rian|budi|dia)\b/i // "diskusi sama budi"
  ];
  return patterns.some(p => p.test(t));
}

function handleStop(chatId = null, reason = "atas perintah Boss Bayu") {
  state.isRunning = false;
  state.isStopped = true;
  state.peerJapriAllowed = false;
  state.peerJapriRemaining = 0;
  state.isGenerating = false;
  pendingUserTurn = false;
  peerTurnCount = 0;
  aiToAiJapriCount = 0;

  if (nextTurnTimeout) {
    clearTimeout(nextTurnTimeout);
    nextTurnTimeout = null;
  }

  pendingDirectQueue = [];
  pendingPeerQueue = [];

  // Kill any running generation child processes immediately
  for (const child of activeChildProcesses) {
    try {
      child.kill("SIGTERM");
      setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
      }, 300);
    } catch {}
  }
  activeChildProcesses.clear();

  setTyping(null, "group");
  setTyping(null, "direct_budi");
  setTyping(null, "direct_rian");

  const targetRoom = chatId || "group";
  const stopNotice = `🛑 Semua aktivitas koding dan japri internal antar-rekan dihentikan ${reason}. Ketik /start atau kirim instruksi baru untuk memulai kembali.`;
  addSystemMessage(stopNotice, targetRoom);
  if (targetRoom !== "group") {
    addSystemMessage(stopNotice, "group");
  }

  saveChatData();
  broadcastSSE("status", getPublicStatus());
}

function handleUserMessage(text, chatId = "group", quoted = null, meta = {}) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const targetChatId = chatId || "group";

  if (trimmed === "/start") {
    handleStart(targetChatId);
    return;
  }

  // Check if Boss Bayu issued a STOP command in ANY room (group, direct_budi, direct_rian)
  if (isStopCommand(trimmed)) {
    addChatMessage({
      sender: "user",
      senderName: "Bayu",
      text: trimmed,
      side: "right",
      chatId: targetChatId,
      quoted: quoted || null
    });
    handleStop(targetChatId, "atas perintah Boss Bayu");
    return;
  }

  // Any regular message from Boss Bayu reactivates chat & resets stopped state
  state.isStopped = false;
  peerTurnCount = 0;
  aiToAiJapriCount = 0;

  // Check if Boss Bayu explicitly commands reading the entire history from beginning
  if (isFullHistoryCommand(trimmed)) {
    state.fullHistoryRequested = state.fullHistoryRequested || {};
    state.fullHistoryRequested[targetChatId] = true;
    console.log(`[Full History Command] Boss Bayu meminta membaca seluruh riwayat di ${targetChatId}: "${trimmed}"`);
  }

  // Check if Boss Bayu commands manual context compaction via chat command
  if (/^(?:\/compact|\/padatkan|padatkan\s+konteks|kompres\s+memori)$/i.test(trimmed)) {
    compressChatContext(targetChatId);
    return;
  }

  // Check if Boss Bayu explicitly commands AI to japri / coordinate with the other peer
  if (isPeerJapriCommand(trimmed)) {
    state.peerJapriAllowed = true;
    state.peerJapriRemaining = 2; // Allow up to 2 exchanges for this specific instruction
    console.log(`[Japri Permission] Izin japri backend internal diberikan oleh Boss Bayu: "${trimmed}"`);
  } else {
    // Lock peer japri by default unless explicitly requested
    state.peerJapriAllowed = false;
    state.peerJapriRemaining = 0;
  }

  // Switch model commands:
  // - /model 1 <model_id_or_keyword> (Budi)
  // - /model 2 <model_id_or_keyword> (Rian)
  // - /model <model_id_or_keyword> (in direct_budi -> Budi, in direct_rian -> Rian)
  const modelMatch = trimmed.match(/^\/model(?:\s+(1|2|a|b))?\s+(.+)$/i);
  if (modelMatch) {
    let which = modelMatch[1] ? modelMatch[1].toLowerCase() : null;
    const rawTarget = modelMatch[2].trim();
    const resolved = resolveModelId(rawTarget);

    if (!which) {
      if (targetChatId === "direct_budi") which = "1";
      else if (targetChatId === "direct_rian") which = "2";
      else which = "1";
    }

    if (which === "1" || which === "a") {
      state.modelA = resolved;
      const engineTag = getEngineTag(resolved);
      addSystemMessage(`🔄 Model Budi (${engineTag}) diubah ke: ${resolved}`, targetChatId);
    } else {
      state.modelB = resolved;
      const engineTag = getEngineTag(resolved);
      addSystemMessage(`🔄 Model Rian (${engineTag}) diubah ke: ${resolved}`, targetChatId);
    }
    saveChatData();
    broadcastSSE("status", getPublicStatus());
    return;
  }

  // Add outgoing user message (Boss Bayu)
  addChatMessage({
    sender: "user",
    senderName: "Bayu",
    text: trimmed,
    side: "right",
    chatId: targetChatId,
    quoted: quoted || null,
    type: meta.type || "chat",
    duration: meta.duration || null
  });

  if (targetChatId === "direct_budi") {
    // Immediate response from Budi in Japri
    setTimeout(() => {
      if (!state.isStopped) runDirectTurn("A", "direct_budi");
    }, 600);
  } else if (targetChatId === "direct_rian") {
    // Immediate response from Rian in Japri
    setTimeout(() => {
      if (!state.isStopped) runDirectTurn("B", "direct_rian");
    }, 600);
  } else {
    // In group
    if (state.isGenerating) {
      if (!state.isRunning) {
        pendingUserTurn = true;
      }
    } else {
      if (state.isRunning) {
        if (nextTurnTimeout) clearTimeout(nextTurnTimeout);
        scheduleNextTurn(1200);
      } else {
        scheduleNextTurn(800, true);
      }
    }
  }
}

function getPublicStatus() {
  const totalMsgs = Object.values(state.chats).reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);
  return {
    topic: state.topic,
    modelA: state.modelA,
    modelB: state.modelB,
    isRunning: state.isRunning,
    isGenerating: state.isGenerating,
    typingWho: state.typingWho,
    typingChatId: state.typingChatId,
    activeChat: state.activeChat,
    availableModels: DEFAULT_MODELS,
    messageCount: totalMsgs,
    wakelock: getWakelockStatus(),
    chatsSummary: {
      group: {
        id: "group",
        name: "Tim Proyek Boss Bayu",
        lastMessage: state.chats.group && state.chats.group.length ? state.chats.group[state.chats.group.length - 1] : null,
        count: state.chats.group ? state.chats.group.length : 0
      },
      direct_budi: {
        id: "direct_budi",
        name: "Budi (Tech Lead)",
        online: true,
        lastMessage: state.chats.direct_budi && state.chats.direct_budi.length ? state.chats.direct_budi[state.chats.direct_budi.length - 1] : null,
        count: state.chats.direct_budi ? state.chats.direct_budi.length : 0
      },
      direct_rian: {
        id: "direct_rian",
        name: "Rian (Developer Lapangan)",
        online: true,
        lastMessage: state.chats.direct_rian && state.chats.direct_rian.length ? state.chats.direct_rian[state.chats.direct_rian.length - 1] : null,
        count: state.chats.direct_rian ? state.chats.direct_rian.length : 0
      }
    }
  };
}

// Keep-alive heartbeat every 15s to keep mobile browser connections alive
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(": ping\n\n");
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

// HTTP Server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost:" + PORT}`);

  // Antigravity integration is disabled by product policy and current Google Terms.
  if (
    url.pathname.startsWith("/api/auth/google") ||
    url.pathname.startsWith("/api/auth/antigravity") ||
    url.pathname === "/oauth2callback"
  ) {
    res.writeHead(410, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      error: "Integrasi Antigravity dinonaktifkan. Gunakan OpenAI Codex atau OpenCode."
    }));
    return;
  }

  // Same-origin CORS. Native/CLI calls without Origin remain allowed.
  const origin = req.headers.origin;
  if (origin) {
    const host = req.headers.host || `127.0.0.1:${PORT}`;
    const allowed = new Set([
      `http://${host}`,
      `https://${host}`,
      `http://127.0.0.1:${PORT}`,
      `http://localhost:${PORT}`
    ]);
    if (!allowed.has(origin)) {
      res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Origin tidak diizinkan" }));
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Routes
  if (url.pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    if (res.flushHeaders) res.flushHeaders();

    // Initial state payload
    res.write(`event: init\ndata: ${JSON.stringify({
      status: getPublicStatus(),
      chats: state.chats,
      messages: state.chats.group, // backward compatibility
      statuses: state.statuses,
      calls: state.calls,
      authVault: getPublicAuthVault()
    })}\n\n`);
    sseClients.add(res);

    req.on("close", () => {
      sseClients.delete(res);
    });
    return;
  }

  if (url.pathname === "/api/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(getPublicStatus()));
    return;
  }

  // CP19: metadata-only team roster. No private transcript or credentials are
  // exposed here. Zovia's actual chat/job execution remains disabled until
  // authenticated per-room data services and engine readiness are implemented.
  if (url.pathname === "/api/team" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(getTeamRegistry()));
    return;
  }

  if (url.pathname === "/api/health" && req.method === "GET") {
    const health = getRuntimeHealth();
    res.writeHead(health.ok ? 200 : 503, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(health));
    return;
  }

  if (url.pathname === "/api/chats" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ chats: state.chats, status: getPublicStatus() }));
    return;
  }

  if (url.pathname === "/api/models" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(DEFAULT_MODELS));
    return;
  }

  if (url.pathname === "/api/chat-files" && req.method === "GET") {
    let files = [];
    try {
      if (fs.existsSync(CHAT_INDEX_FILE)) {
        files = JSON.parse(fs.readFileSync(CHAT_INDEX_FILE, "utf-8") || "[]");
      }
    } catch {}
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(files));
    return;
  }

  // Workstation Status & Hot-Swap Endpoints
  if (url.pathname === "/api/workstation/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      active: activeWorkstation,
      available: ["alpine", "ubuntu"],
      storage: {
        alpine: "/workstations/alpine",
        ubuntu: "/workstations/ubuntu",
        workspaces: {
          budi: BUDI_WORKSPACE,
          rian: RIAN_WORKSPACE
        }
      }
    }));
    return;
  }

  if (url.pathname === "/api/workstation/switch" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        if (!parsed.target) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Parameter target ('alpine' atau 'ubuntu') diperlukan" }));
        }
        activeWorkstation = parsed.target.toLowerCase() === "ubuntu" ? "ubuntu" : "alpine";
        fs.writeFileSync(WORKSTATION_STATE_FILE, JSON.stringify({ active: activeWorkstation }), "utf-8");
        broadcastSSE("workstation", { active: activeWorkstation });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, active: activeWorkstation }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Raw shell execution is intentionally disabled in the HTTP backend.
  // Android uses the native TerminalSession/NativeBridge path instead.
  if (url.pathname === "/api/terminal/exec" && req.method === "POST") {
    res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      error: "Raw terminal execution via HTTP dinonaktifkan di v2. Gunakan terminal native Android."
    }));
    return;
  }

  // Terminal Feedback Loop Endpoint (Adopted from Droide Architecture)
  if (url.pathname === "/api/agent/feedback" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const feedback = JSON.parse(body || "{}");
        const command = feedback.command || "Perintah tidak dikenal";
        const exitCode = feedback.exitCode || 1;
        const errorDetails = feedback.errorDetails || "Error tidak diketahui";

        const feedbackMessage = {
          id: `sys-feedback-${Date.now()}`,
          chatId: state.activeChat || "group",
          type: "system",
          text: `⚠️ **Terminal Feedback Loop (Droide Engine)**:\nPerintah: \`${command}\` gagal (Exit: ${exitCode})\nDetail:\n\`\`\`\n${errorDetails.slice(0, 300)}\n\`\`\``,
          time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        };

        if (!state.chats[feedbackMessage.chatId]) state.chats[feedbackMessage.chatId] = [];
        state.chats[feedbackMessage.chatId].push(feedbackMessage);
        saveChatData();
        broadcastSSE("message", feedbackMessage);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, delivered: true }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Internal endpoint for CLI tools (chat-send) to add files directly to chat
  if (url.pathname === "/api/internal/chat-file" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const sender = data.sender || "ai1";
        const senderName = data.senderName || (sender === "ai1" ? "Budi" : (sender === "ai2" ? "Rian" : "Bayu"));
        const filename = data.filename;
        const storedAs = data.storedAs;
        const size = data.size;
        const caption = data.caption || "";
        const targetChatId = data.chatId || (sender === "ai1" ? "direct_budi" : (sender === "ai2" ? "direct_rian" : "group"));

        const msg = addFileMessage({
          sender,
          senderName,
          side: sender === "user" ? "right" : "left",
          filename,
          storedAs,
          size,
          caption,
          chatId: targetChatId
        });

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, message: msg }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Internal endpoint for CLI tools (chat-post, vn-send) to add text messages or voice notes directly
  if (url.pathname === "/api/internal/chat-message" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        let targetChatId = data.chatId || "group";
        const sender = data.sender || "ai1";
        const senderName = data.senderName || (sender === "ai1" ? "Budi" : (sender === "ai2" ? "Rian" : "Bayu"));
        const text = data.text || "";
        const type = data.type || "chat";
        const duration = data.duration || (type === "voice_note" ? "00:05" : null);
        const quoted = data.quoted || null;
        const triggerTurn = data.triggerTurn !== false;

        // If AI is trying to japri the other AI (e.g. Rian targeting direct_budi, Budi targeting direct_rian, or peer/internal),
        // route it to the backend internal peer channel instead of cluttering Boss Bayu's private chats!
        if (targetChatId === "peer" || targetChatId === "internal" ||
           (targetChatId === "direct_budi" && sender === "ai2") ||
           (targetChatId === "direct_rian" && sender === "ai1")) {

          if (state.isStopped) {
            res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ error: "🛑 Japri internal dihentikan atas perintah Boss Bayu." }));
            return;
          }

          if (!state.peerJapriAllowed || state.peerJapriRemaining <= 0) {
            res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({
              error: "🛑 Akses ditolak: Japri internal antar-rekan terkunci. Anda hanya boleh menjapri rekan jika Boss Bayu secara eksplisit memerintahkannya (contoh: 'japri dia', 'ajak ke chat', 'koordinasi sama rian/budi')."
            }));
            return;
          }

          if (typeof state.peerJapriRemaining === "number") {
            state.peerJapriRemaining--;
            if (state.peerJapriRemaining <= 0) {
              state.peerJapriAllowed = false;
            }
          }

          const peerMsg = {
            id: "peer-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
            sender,
            senderName,
            text,
            time: nowTime(),
            timestamp: new Date().toISOString()
          };
          if (!state.internalPeer) state.internalPeer = [];
          state.internalPeer.push(peerMsg);
          saveChatData();
          broadcastSSE("internal_peer", peerMsg);

          if (triggerTurn && !state.isStopped && state.peerJapriAllowed) {
            const nextTarget = sender === "ai1" ? "B" : "A";
            setTimeout(() => { if (!state.isStopped && state.peerJapriAllowed) runPeerTurn(nextTarget); }, 800);
          }

          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: true, isPeer: true, message: peerMsg }));
          return;
        }

        const msg = addChatMessage({
          sender,
          senderName,
          text,
          side: sender === "user" ? "right" : "left",
          chatId: targetChatId,
          type,
          duration,
          quoted
        });

        if (triggerTurn && !state.isStopped) {
          if (targetChatId === "group") {
            if (sender === "ai1") {
              state.nextSpeaker = "B";
              scheduleNextTurn(1200, true);
            } else if (sender === "ai2") {
              state.nextSpeaker = "A";
              scheduleNextTurn(1200, true);
            }
          } else if (targetChatId === "direct_budi" && sender === "user") {
            setTimeout(() => { if (!state.isStopped) runDirectTurn("A", "direct_budi"); }, 1000);
          } else if (targetChatId === "direct_rian" && sender === "user") {
            setTimeout(() => { if (!state.isStopped) runDirectTurn("B", "direct_rian"); }, 1000);
          }
        }

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, message: msg }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Internal peer message endpoint for AI-to-AI backend japri
  if (url.pathname === "/api/internal/peer-message" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        if (state.isStopped) {
          res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "🛑 Japri internal dihentikan atas perintah Boss Bayu." }));
          return;
        }
        if (!state.peerJapriAllowed || state.peerJapriRemaining <= 0) {
          res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            error: "🛑 Akses ditolak: Japri internal antar-rekan terkunci. Anda hanya boleh menjapri rekan jika Boss Bayu secara eksplisit memerintahkannya (contoh: 'japri dia', 'ajak ke chat', 'koordinasi sama rian/budi')."
          }));
          return;
        }
        if (typeof state.peerJapriRemaining === "number") {
          state.peerJapriRemaining--;
          if (state.peerJapriRemaining <= 0) {
            state.peerJapriAllowed = false;
          }
        }
        const data = JSON.parse(body || "{}");
        const sender = data.sender || "ai1";
        const senderName = data.senderName || (sender === "ai1" ? "Budi" : "Rian");
        const text = (data.text || "").trim();
        if (!text) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "Teks pesan peer tidak boleh kosong." }));
          return;
        }

        const peerMsg = {
          id: "peer-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          sender,
          senderName,
          text,
          time: nowTime(),
          timestamp: new Date().toISOString()
        };
        if (!state.internalPeer) state.internalPeer = [];
        state.internalPeer.push(peerMsg);
        saveChatData();
        broadcastSSE("internal_peer", peerMsg);

        const nextSpeaker = sender === "ai1" ? "B" : "A";
        if (state.peerJapriAllowed) {
          setTimeout(() => {
            if (!state.isStopped && state.peerJapriAllowed) runPeerTurn(nextSpeaker);
          }, 800);
        }

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, message: peerMsg }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Get internal peer messages
  if (url.pathname === "/api/internal/peer-messages" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(state.internalPeer || []));
    return;
  }

  // File download / view route: /api/files/:filename
  if (url.pathname.startsWith("/api/files/")) {
    const rawFilename = decodeURIComponent(url.pathname.replace(/^\/api\/files\//, ""));
    const safeFilename = path.basename(rawFilename);
    const filePath = path.join(CHAT_FILES_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("File tidak ditemukan.");
      return;
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".txt": "text/plain; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".py": "text/x-python; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".zip": "application/zip",
      ".tar": "application/x-tar",
      ".gz": "application/gzip"
    };

    const contentType = mimeMap[ext] || "application/octet-stream";
    const stat = fs.statSync(filePath);
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(safeFilename);
    const isDownload = url.searchParams.get("download") === "1" || !isImage;
    const dispositionType = isDownload ? "attachment" : "inline";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stat.size,
      "Content-Disposition": `${dispositionType}; filename="${safeFilename}"`
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Statuses (Stories) endpoints
  if (url.pathname === "/api/statuses" && req.method === "GET") {
    cleanupExpiredStatuses();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ statuses: state.statuses }));
    return;
  }

  if (url.pathname === "/api/statuses" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const author = (data.author || "user").toLowerCase();
        const authorName = data.authorName || (author === "budi" ? "Budi (Tech Lead)" : (author === "rian" ? "Rian (Developer Lapangan)" : "Boss Bayu"));
        const text = (data.text || "").trim();
        const bgGradient = data.bgGradient || null;
        const imageUrl = data.imageUrl || null;

        if (!text && !imageUrl) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "Isi status tidak boleh kosong" }));
          return;
        }

        const statusItem = createStatus(author, authorName, text, bgGradient, imageUrl);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, statusItem }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Delete a status
  if (url.pathname === "/api/statuses/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        state.statuses = state.statuses.filter((s) => s.id !== data.id);
        saveChatData();
        broadcastSSE("status_update", { statuses: state.statuses });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, statuses: state.statuses }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Reply to a status story (sends to contact's direct chat)
  if (url.pathname === "/api/statuses/reply" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const statusId = data.statusId;
        const replyText = data.text || "";
        const targetContact = data.targetContact || "budi"; // 'budi' or 'rian'
        const targetChatId = targetContact === "rian" ? "direct_rian" : "direct_budi";
        const speaker = targetContact === "rian" ? "B" : "A";

        // Find status
        const found = state.statuses.find(s => s.id === statusId);
        const quotedText = found ? (found.text || "Status Gambar") : "Status";

        // Add user reply to that contact's direct chat
        addChatMessage({
          sender: "user",
          senderName: "Bayu",
          text: replyText,
          side: "right",
          chatId: targetChatId,
          quoted: {
            type: "status",
            text: quotedText
          }
        });

        // Trigger AI reply in japri
        setTimeout(() => {
          runDirectTurn(speaker, targetChatId);
        }, 800);

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, chatId: targetChatId }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Context Compression & Memory Management Endpoints
  if (url.pathname === "/api/context/compress" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const targetChatId = data.chatId || state.activeChat || "group";
        const result = compressChatContext(targetChatId);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === "/api/context/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      contextMemory: state.contextMemory || {},
      topic: state.topic,
      chatCounts: {
        group: (state.chats.group || []).length,
        direct_budi: (state.chats.direct_budi || []).length,
        direct_rian: (state.chats.direct_rian || []).length
      }
    }));
    return;
  }

  // Multi-Profile Auth Vault Endpoints
  if (url.pathname === "/api/auth/vault" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(getPublicAuthVault()));
    return;
  }

  if (url.pathname === "/api/auth/switch" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const switched = switchAuthProfile(data.engine, data.profileId);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, activeProfile: switched, vault: getPublicAuthVault() }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === "/api/auth/add" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const added = addAuthProfile(data);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, profile: added, vault: getPublicAuthVault() }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === "/api/auth/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        deleteAuthProfile(data.profileId);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, vault: getPublicAuthVault() }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // --- Real Native Auth Endpoints (OpenAI Codex Device Auth) ---
  if (url.pathname === "/api/auth/codex/start-device-login" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        const result = await startCodexDeviceLogin(data.alias || "");
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (url.pathname === "/api/auth/codex/check-login" && req.method === "GET") {
    const loginId = url.searchParams.get("loginId");
    const session = pendingCodexLogins.get(loginId);
    if (!session) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Sesi login tidak ditemukan atau kedaluwarsa" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      status: session.status,
      deviceCode: session.deviceCode,
      authUrl: session.authUrl,
      email: session.email,
      profile: session.profile,
      error: session.error
    }));
    return;
  }

  if (url.pathname === "/api/auth/codex/cancel-login" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const ok = cancelCodexDeviceLogin(data.loginId);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: ok }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Bind specific auth profile to persona (Budi / Rian)
  if (url.pathname === "/api/auth/bind-persona" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const { persona, engine, profileId } = data; // persona: 'budi'|'rian', engine: 'codex', profileId: string|null
        if (engine !== "codex") throw new Error("Hanya binding profil Codex yang didukung.");
        if (!authVault.personaBinding) authVault.personaBinding = { budi: {}, rian: {} };
        if (!authVault.personaBinding[persona]) authVault.personaBinding[persona] = {};
        if (profileId) {
          authVault.personaBinding[persona][engine] = profileId;
        } else {
          delete authVault.personaBinding[persona][engine];
        }
        saveAuthVault();
        broadcastSSE("auth_vault", getPublicAuthVault());
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, vault: getPublicAuthVault() }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === "/api/calls" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ calls: state.calls }));
    return;
  }

  if (url.pathname === "/api/calls/start" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const contactId = data.contactId || "budi";
        const callType = data.type || "voice";
        const contactName = contactId === "rian" ? "Rian (Developer)" : "Budi (Tech Lead)";

        const callRecord = {
          id: "call-" + Date.now(),
          contactId,
          contactName,
          type: callType,
          direction: "outgoing",
          time: nowTime(),
          dateFormatted: `Hari ini, ${nowTime()}`,
          duration: "Berlangsung"
        };
        state.calls.unshift(callRecord);
        saveChatData();
        broadcastSSE("call_event", { event: "call_started", call: callRecord });

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, call: callRecord }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === "/api/calls/speak" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        const contactId = data.contactId || "budi";
        const spokenText = data.text || "Halo, bisa dengar suara saya?";
        const speaker = contactId === "rian" ? "B" : "A";

        const replySpeech = await runPhoneTurn(speaker, spokenText, data.callId);

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, replySpeech, speaker: contactId === "rian" ? "Rian" : "Budi" }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === "/api/calls/end" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        if (state.calls.length && data.duration) {
          state.calls[0].duration = data.duration;
          saveChatData();
        }
        broadcastSSE("call_event", { event: "call_ended", duration: data.duration });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === "/api/calls/trigger-incoming" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const contactId = data.contactId || "budi";
        const callType = data.type || "voice";
        const contactName = contactId === "rian" ? "Rian (Developer)" : "Budi (Tech Lead)";

        const callRecord = {
          id: "call-" + Date.now(),
          contactId,
          contactName,
          type: callType,
          direction: "incoming",
          time: nowTime(),
          dateFormatted: `Hari ini, ${nowTime()}`,
          duration: "Panggilan Masuk"
        };
        state.calls.unshift(callRecord);
        saveChatData();
        broadcastSSE("incoming_call", { call: callRecord });

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, call: callRecord }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Trigger spontaneous Japri from AI
  if (url.pathname === "/api/japri/initiate" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        const targetContact = data.contactId || "budi";
        const speaker = targetContact === "rian" ? "B" : "A";
        const targetChatId = targetContact === "rian" ? "direct_rian" : "direct_budi";
        const reason = data.reason || "follow_up";

        const groupRecent = getConversationHistory("group", 6);
        const speakerName = targetContact === "rian" ? "Rian" : "Budi";
        const model = targetContact === "rian" ? state.modelB : state.modelA;

        const prompt = `Kamu adalah ${speakerName}, programmer manusia yang bekerja bersama Boss Bayu.
Kamu sedang berinisiatif menghubungi Boss Bayu secara pribadi (japri) di WhatsApp untuk: ${reason === "follow_up" ? "lapor follow-up tugas atau progres kodingan" : "menyapa dan menanyakan arahan terbaru secara santai/santun"}.
Konteks terakhir di grup:
${groupRecent}

Tulis 1 pesan inisiatif japri (1-2 kalimat) yang ramah dan solutif ke Boss Bayu. Langsung tulis pesanmu.`;

        const resp = await callAgent(model, prompt, speaker);
        let cleanText = stripAnsi(resp).trim().replace(new RegExp(`^(\\*\\*|\\*)?${speakerName}(\\*\\*|\\*)?\\s*:\\s*`, "i"), "").trim();
        if (cleanText) {
          addChatMessage({
            sender: targetContact === "rian" ? "ai2" : "ai1",
            senderName: speakerName,
            text: cleanText,
            side: "left",
            model,
            chatId: targetChatId
          });
        }

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, message: cleanText, chatId: targetChatId }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Upload file / photo
  if (url.pathname === "/api/upload" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const filename = data.filename || "upload.bin";
        const base64Data = data.contentBase64 || "";
        const caption = data.caption || "";
        const targetChatId = data.chatId || "group";

        if (!base64Data) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Data file tidak boleh kosong." }));
          return;
        }

        const buffer = Buffer.from(base64Data, "base64");
        const storedAs = `${Date.now()}_${path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const savePath = path.join(CHAT_FILES_DIR, storedAs);

        fs.writeFileSync(savePath, buffer);

        const record = {
          id: "file-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          filename: path.basename(filename),
          storedAs,
          size: buffer.length,
          sizeFormatted: formatBytes(buffer.length),
          sender: "user",
          senderName: "Bayu",
          caption: caption || `Mengirim file: ${path.basename(filename)}`,
          chatId: targetChatId,
          timestamp: new Date().toISOString(),
          time: nowTime()
        };

        let list = [];
        try {
          if (fs.existsSync(CHAT_INDEX_FILE)) {
            list = JSON.parse(fs.readFileSync(CHAT_INDEX_FILE, "utf-8") || "[]");
          }
        } catch {}
        list.push(record);
        fs.writeFileSync(CHAT_INDEX_FILE, JSON.stringify(list, null, 2));

        const msg = addFileMessage({
          sender: "user",
          senderName: "Bayu",
          side: "right",
          filename: path.basename(filename),
          storedAs,
          size: buffer.length,
          caption: caption || `Mengirim file: ${path.basename(filename)}`,
          chatId: targetChatId
        });

        if (targetChatId === "direct_budi") {
          setTimeout(() => runDirectTurn("A", "direct_budi"), 600);
        } else if (targetChatId === "direct_rian") {
          setTimeout(() => runDirectTurn("B", "direct_rian"), 600);
        } else {
          if (!state.isGenerating) {
            if (state.isRunning) {
              scheduleNextTurn(1200);
            } else {
              scheduleNextTurn(800, true);
            }
          } else if (!state.isRunning) {
            pendingUserTurn = true;
          }
        }

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, file: record, message: msg }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Send message
  if (url.pathname === "/api/message" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        // Do not route unfinished Zovia chat requests through Budi or Rian.
        // This fail-closed gate must precede any message persistence or run.
        if (data.chatId === "direct_zovia") {
          res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            code: "AGENT_NOT_READY",
            error: "Zovia chat execution is not enabled yet; private room is reserved."
          }));
          return;
        }
        if (data.text) {
          handleUserMessage(data.text, data.chatId || "group", data.quoted || null, {
            type: data.type,
            duration: data.duration
          });
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, status: getPublicStatus() }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Control loop (/start, /stop)
  if (url.pathname === "/api/control" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        if (data.action === "start") handleStart(data.chatId);
        else if (data.action === "stop") handleStop(data.chatId, "melalui tombol Stop");
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, status: getPublicStatus() }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Update Config
  if (url.pathname === "/api/config" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        let changed = false;
        if (data.modelA && data.modelA !== state.modelA) {
          state.modelA = data.modelA;
          addSystemMessage(`🔄 Model Budi diganti ke: ${data.modelA}`, "group");
          changed = true;
        }
        if (data.modelB && data.modelB !== state.modelB) {
          state.modelB = data.modelB;
          addSystemMessage(`🔄 Model Rian diganti ke: ${data.modelB}`, "group");
          changed = true;
        }
        if (data.topic && data.topic !== state.topic) {
          state.topic = data.topic;
          addSystemMessage(`📋 Topik diskusi diganti ke: "${data.topic}"`, "group");
          changed = true;
        }
        if (changed) {
          saveChatData();
          broadcastSSE("status", getPublicStatus());
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, status: getPublicStatus() }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Clear messages
  if (url.pathname === "/api/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const targetChat = data.chatId || "group";
        if (targetChat === "all") {
          state.chats = { group: [], direct_budi: [], direct_rian: [] };
          addSystemMessage("🧹 Semua riwayat chat dibersihkan.", "group");
        } else {
          state.chats[targetChat] = [];
          addSystemMessage(`🧹 Riwayat chat ${targetChat} dibersihkan.`, targetChat);
        }
        saveChatData();
        broadcastSSE("clear", { chatId: targetChat });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Wakelock endpoints
  if (url.pathname === "/api/wakelock" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(getWakelockStatus()));
    return;
  }

  if (url.pathname === "/api/wakelock" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const action = (data.action || "").toLowerCase();
        let wl;
        if (action === "acquire" || action === "on") {
          wl = acquireWakelock(data.reason || "api");
          addSystemMessage("🔒 Wakelock diaktifkan — server tidak akan dimatikan Android kecuali kamu sendiri yang melepas.", "group");
        } else if (action === "release" || action === "off") {
          wl = releaseWakelock(data.reason || "api");
          addSystemMessage("🔓 Wakelock dilepas — server sekarang boleh dimatikan.", "group");
        } else {
          wl = getWakelockStatus();
        }
        broadcastSSE("wakelock", wl);
        broadcastSSE("status", getPublicStatus());
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, wakelock: wl, status: getPublicStatus() }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Static File Serving
  const cleanPath = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  let filePath = path.join(WEB_DIR, cleanPath);
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav"
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        fs.readFile(path.join(WEB_DIR, "index.html"), (err2, content2) => {
          if (err2) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
          } else {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(content2);
          }
        });
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error: " + err.code);
      }
    } else {
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      res.end(content);
    }
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`⚠️ Port ${PORT} sedang digunakan oleh proses lain.`);
  } else {
    console.error("⚠️ Server error:", err);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server WhatsApp Web Super App AI berjalan di http://${HOST}:${PORT}`);
  console.log(`🔒 Wakelock AKTIF (pid=${process.pid}) — tolak SIGTERM/SIGINT/SIGHUP kecuali .wakelock_stop ada / release via API.`);
});
