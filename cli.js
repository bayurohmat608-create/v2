const readline = require("readline");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const SERVER_HOST = process.env.HOST || "127.0.0.1";
const SERVER_PORT = process.env.PORT || 3000;
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
const SERVER_SCRIPT = path.join(__dirname, "server.js");

// ANSI Colors
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  headerBg: "\x1b[48;5;23m\x1b[97m",
  noticeBg: "\x1b[48;5;229m\x1b[30m",
  budiName: "\x1b[38;5;39m\x1b[1m", // Cyan
  rianName: "\x1b[38;5;208m\x1b[1m", // Orange
  userName: "\x1b[38;5;48m\x1b[1m", // Green
  budiBorder: "\x1b[38;5;39m",
  rianBorder: "\x1b[38;5;208m",
  userBorder: "\x1b[38;5;48m",
  bubbleLeftBg: "\x1b[48;5;236m\x1b[97m",
  bubbleRightBg: "\x1b[48;5;23m\x1b[97m",
  tick: "\x1b[38;5;39m",
  time: "\x1b[90m",
  system: "\x1b[93m"
};

const TERM_WIDTH = Math.min(process.stdout.columns || 80, 80);
const BUBBLE_WIDTH = Math.min(Math.max(TERM_WIDTH - 18, 36), 56);

function padRight(str, len) {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function wrapText(text, width) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= width) {
      current += " " + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

// Print WhatsApp Left Bubble (Budi or Rian)
function printLeftBubble(senderName, personaTag, text, time, model) {
  const isBudi = senderName === "Budi";
  const nameColor = isBudi ? C.budiName : C.rianName;
  const borderColor = isBudi ? C.budiBorder : C.rianBorder;
  const lines = wrapText(text, BUBBLE_WIDTH);
  const modelTag = model ? ` ${C.dim}[${model.split("-").slice(0, 3).join("-")}]${C.reset}` : "";

  console.log(`\n  ${nameColor}◤ ${senderName} (${personaTag})${C.reset}${modelTag}`);
  console.log(`  ${borderColor}╭${"─".repeat(BUBBLE_WIDTH + 2)}${C.reset}`);
  for (const line of lines) {
    console.log(`  ${borderColor}│${C.reset} ${padRight(line, BUBBLE_WIDTH)} ${borderColor}│${C.reset}`);
  }
  console.log(`  ${borderColor}╰${"─".repeat(BUBBLE_WIDTH + 2)}${C.reset}  ${C.time}${time}${C.reset}\n`);
}

// Print WhatsApp Right Bubble (Kamu / User)
function printRightBubble(text, time) {
  const lines = wrapText(text, BUBBLE_WIDTH);
  const indent = " ".repeat(Math.max(TERM_WIDTH - BUBBLE_WIDTH - 8, 12));

  console.log(`\n${indent}${C.userName}Boss Bayu (👑 Ketua & Admin) ◢${C.reset}`);
  console.log(`${indent}${C.userBorder}╭${"─".repeat(BUBBLE_WIDTH + 2)}${C.reset}`);
  for (const line of lines) {
    console.log(`${indent}${C.userBorder}│${C.reset} ${padRight(line, BUBBLE_WIDTH)} ${C.userBorder}│${C.reset}`);
  }
  console.log(`${indent}${C.userBorder}╰${"─".repeat(BUBBLE_WIDTH + 2)}${C.reset}  ${C.time}${time} ${C.tick}✓✓${C.reset}\n`);
}

function printSystem(text) {
  console.log(`\n  ${C.system}ℹ️  ${text}${C.reset}\n`);
}

function printHeader(topic, modelA, modelB) {
  console.clear();
  console.log(`${C.headerBg}${" ".repeat(TERM_WIDTH)}${C.reset}`);
  console.log(`${C.headerBg}  👥 GRUP WHATSAPP: ${padRight(topic.slice(0, TERM_WIDTH - 24), TERM_WIDTH - 24)}  ${C.reset}`);
  console.log(`${C.headerBg}  👑 Boss Bayu (Ketua & Admin) • online │ Budi • online │ Rian • online  ${C.reset}`);
  console.log(`${C.headerBg}${" ".repeat(TERM_WIDTH)}${C.reset}`);
  console.log(`  ${C.noticeBg} 🔒 Transparan: Budi & Rian mengira ini grup manusia biasa. ${C.reset}`);
  console.log(`  ${C.dim}Model Budi: ${modelA} | Model Rian: ${modelB}${C.reset}`);
  console.log(`  ${C.dim}Web UI aktif di: http://localhost:3000${C.reset}`);
  console.log(`  ${C.bold}Perintah:${C.reset} ${C.budiName}/start${C.reset} (mulai looping) | ${C.rianName}/stop${C.reset} (jeda) | ${C.userName}/model${C.reset} (ganti model)`);
  console.log(`  ${C.dim}Ketik pesan apapun untuk langsung ikut nimbrung ngobrol!${C.reset}`);
  console.log(`${C.dim}${"─".repeat(TERM_WIDTH)}${C.reset}`);
}

async function request(path, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const req = http.request(
      url,
      {
        method,
        headers: data ? { "Content-Type": "application/json" } : {}
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body || "{}"));
          } catch {
            resolve(body);
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function checkOrStartServer() {
  try {
    await request("/api/status");
    return true;
  } catch {
    // Start server in background
    const proc = spawn("node", [SERVER_SCRIPT], {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        GODEBUG: "netdns=cgo",
        PATH: `${path.join(__dirname, ".local", "bin")}:${path.join(__dirname, "node_modules", ".bin")}:${process.env.PATH || ""}:/usr/local/bin:/usr/bin:/bin`,
        HOST: SERVER_HOST,
        PORT: String(SERVER_PORT),
        CHAT_AI_RUNTIME_DIR: process.env.CHAT_AI_RUNTIME_DIR || path.join(__dirname, ".runtime")
      }
    });
    proc.unref();

    // Wait until server is up
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        await request("/api/status");
        return true;
      } catch {}
    }
    return false;
  }
}

async function main() {
  const ready = await checkOrStartServer();
  if (!ready) {
    console.error("Gagal menjalankan server latar belakang.");
    process.exit(1);
  }

  const status = await request("/api/status");
  printHeader(status.topic, status.modelA, status.modelB);

  // SSE Listener for real-time messages
  const seenMessages = new Set();
  const req = http.request(`${SERVER_URL}/api/events`, (res) => {
    let buffer = "";
    res.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const block of lines) {
        let event = "message";
        let data = "";
        block.split("\n").forEach((line) => {
          if (line.startsWith("event: ")) event = line.slice(7).trim();
          if (line.startsWith("data: ")) data = line.slice(6).trim();
        });

        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          if (event === "message") {
            if (seenMessages.has(parsed.id)) continue;
            seenMessages.add(parsed.id);

            if (parsed.type === "system") {
              printSystem(parsed.text);
            } else if (parsed.type === "file" && parsed.file) {
              const fileNotice = `📎 [FILE: ${parsed.file.name} (${parsed.file.size})]\n${parsed.text}\n(Gunakan: chat-get ${parsed.file.name} untuk mengunduh)`;
              if (parsed.side === "right") {
                printRightBubble(fileNotice, parsed.time);
              } else {
                const tag = parsed.senderName === "Budi" ? "Si Kritis" : "Si Santai";
                printLeftBubble(parsed.senderName, tag, fileNotice, parsed.time, parsed.model);
              }
            } else if (parsed.side === "right") {
              printRightBubble(parsed.text, parsed.time);
            } else {
              const tag = parsed.senderName === "Budi" ? "Si Kritis" : "Si Santai";
              printLeftBubble(parsed.senderName, tag, parsed.text, parsed.time, parsed.model);
            }
            rl.prompt(true);
          } else if (event === "typing") {
            if (parsed.typing) {
              process.stdout.write(`\r  ${C.dim}${parsed.who} sedang mengetik... ●●●${C.reset}\r`);
            }
          } else if (event === "status") {
            // Updated status
          }
        } catch {}
      }
    });
  });
  req.on("error", (e) => console.error("Koneksi event terputus:", e.message));
  req.end();

  let currentCliRoom = "group";
  function getCliPrompt() {
    if (currentCliRoom === "direct_budi") {
      return `${C.budiName}[Boss Bayu 👑 ➔ Japri Budi] > ${C.reset}`;
    }
    if (currentCliRoom === "direct_rian") {
      return `${C.rianName}[Boss Bayu 👑 ➔ Japri Rian] > ${C.reset}`;
    }
    return `${C.userName}[Boss Bayu (👑 Tim Proyek)] > ${C.reset}`;
  }

  // Interactive Readline
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: getCliPrompt()
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed === "/help") {
      console.log(`
  ${C.bold}Daftar Perintah:${C.reset}
  ${C.budiName}/start${C.reset}               - Memulai percakapan otomatis (terus berjalan sampai /stop)
  ${C.rianName}/stop${C.reset} atau ${C.rianName}/st${C.reset}       - Menghentikan/menjeda percakapan otomatis
  ${C.userName}/model${C.reset}              - Lihat daftar model yang tersedia
  ${C.userName}/model 1 <nama>${C.reset}     - Ganti model AI untuk Budi (Si Kritis)
  ${C.userName}/model 2 <nama>${C.reset}     - Ganti model AI untuk Rian (Si Santai)
  ${C.userName}/topic <topik baru>${C.reset} - Ganti topik diskusi
  ${C.userName}/status${C.reset}             - Lihat linimasa Status WhatsApp tim (24 jam)
  ${C.userName}/status <teks>${C.reset}      - Pasang Status WhatsApp baru sebagai Boss Bayu
  ${C.userName}/switch <1|2|group>${C.reset} - Beralih ruang obrolan (1: Japri Budi, 2: Japri Rian, group: Grup)
  ${C.userName}/clear${C.reset}              - Bersihkan layar & riwayat chat
  ${C.userName}/exit${C.reset}               - Keluar dari CLI
  ${C.dim}(Ketik pesan apapun tanpa garis miring untuk berbicara langsung di grup!)${C.reset}
      `);
      rl.prompt();
      return;
    }

    if (trimmed === "/exit") {
      console.log("\nSampai jumpa!");
      process.exit(0);
    }

    if (trimmed === "/web") {
      console.log(`\n  🌐 Buka browser Anda di: ${C.bold}http://localhost:3000${C.reset}\n`);
      rl.prompt();
      return;
    }

    if (trimmed === "/clear") {
      await request("/api/clear", "POST");
      console.clear();
      const st = await request("/api/status");
      printHeader(st.topic, st.modelA, st.modelB);
      rl.prompt();
      return;
    }

    if (trimmed === "/model" || trimmed === "/models") {
      const models = await request("/api/models");
      const st = await request("/api/status");
      console.log(`\n  ${C.bold}Model Saat Ini:${C.reset}`);
      console.log(`  - Budi (1): ${C.budiName}${st.modelA}${C.reset}`);
      console.log(`  - Rian (2): ${C.rianName}${st.modelB}${C.reset}\n`);
      console.log(`  ${C.bold}Pilihan Model Tersedia:${C.reset}`);
      models.forEach((m, idx) => {
        console.log(`   ${idx + 1}. ${m.id} (${m.name})`);
      });
      console.log(`\n  Cara ganti: ${C.dim}/model 1 gemini-3.1-pro-high${C.reset} atau ${C.dim}/model 2 claude-sonnet-5-5-high${C.reset}\n`);
      rl.prompt();
      return;
    }

    if (trimmed.startsWith("/topic ")) {
      const newTopic = trimmed.slice(7).trim();
      await request("/api/config", "POST", { topic: newTopic });
      rl.prompt();
      return;
    }

    if (trimmed.startsWith("/switch ")) {
      const target = trimmed.slice(8).trim().toLowerCase();
      if (target === "budi" || target === "1") {
        currentCliRoom = "direct_budi";
        console.log(`\n  💬 Beralih ke Chat Pribadi (Japri) dengan ${C.budiName}Budi (Tech Lead)${C.reset}\n`);
      } else if (target === "rian" || target === "2") {
        currentCliRoom = "direct_rian";
        console.log(`\n  💬 Beralih ke Chat Pribadi (Japri) dengan ${C.rianName}Rian (Developer Lapangan)${C.reset}\n`);
      } else {
        currentCliRoom = "group";
        console.log(`\n  👥 Beralih ke Grup Tim Proyek Boss Bayu\n`);
      }
      rl.setPrompt(getCliPrompt());
      rl.prompt();
      return;
    }

    if (trimmed.startsWith("/japri ")) {
      const parts = trimmed.slice(7).trim().split(/\s+/);
      const target = parts[0].toLowerCase();
      const msg = parts.slice(1).join(" ");
      const chatId = (target === "rian" || target === "2") ? "direct_rian" : "direct_budi";
      if (!msg) {
        console.log(`\n  Gunakan: /japri budi <pesan> atau /japri rian <pesan>\n`);
        rl.prompt();
        return;
      }
      await request("/api/message", "POST", { text: msg, chatId });
      rl.prompt();
      return;
    }

    if (trimmed === "/status" || trimmed.startsWith("/status ")) {
      const statusText = trimmed.slice(7).trim();
      if (!statusText) {
        const res = await request("/api/statuses");
        console.log(`\n  ${C.bold}📱 Status WhatsApp Aktif (24 Jam):${C.reset}`);
        if (!res.statuses || res.statuses.length === 0) {
          console.log(`  (Belum ada status aktif)\n`);
        } else {
          res.statuses.forEach(s => {
            const authorColor = s.author === "user" ? C.userName : (s.author === "budi" ? C.budiName : C.rianName);
            console.log(`  - ${authorColor}${s.authorName}${C.reset} (${C.dim}${s.timeFormatted || "Hari ini"}${C.reset}):\n    "${s.text}"`);
          });
          console.log("");
        }
      } else {
        const res = await request("/api/statuses", "POST", { text: statusText, author: "user" });
        if (res.success) {
          console.log(`\n  ✅ Status Boss Bayu berhasil dipasang di WhatsApp: "${statusText}"\n`);
        }
      }
      rl.prompt();
      return;
    }

    // Send to server in current active room
    await request("/api/message", "POST", { text: trimmed, chatId: currentCliRoom });
    rl.prompt();
  });
}

main().catch(console.error);
