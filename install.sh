#!/usr/bin/env bash
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

MIN_NODE_MAJOR=18
RUNTIME_DIR="${CHAT_AI_RUNTIME_DIR:-$DIR/.runtime}"
LOCAL_BIN="$DIR/.local/bin"
ALLOW_PARTIAL_ENGINES="${ALLOW_PARTIAL_ENGINES:-0}"

info(){ printf '\033[34m[*]\033[0m %s\n' "$*"; }
ok(){ printf '\033[32m[✓]\033[0m %s\n' "$*"; }
warn(){ printf '\033[33m[!]\033[0m %s\n' "$*"; }
die(){ printf '\033[31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

command_ok() {
  local cmd="$1"
  "$cmd" --version >/dev/null 2>&1
}

mkdir -p "$RUNTIME_DIR/workspaces/budi" "$RUNTIME_DIR/workspaces/rian"   "$LOCAL_BIN" "$DIR/auth_vault/antigravity" "$DIR/auth_vault/codex" "$DIR/chat_files"

command -v node >/dev/null 2>&1 || die "Node.js belum terpasang. Gunakan Node.js v18+."
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
[ "$NODE_MAJOR" -ge "$MIN_NODE_MAJOR" ] || die "Node.js v18+ diperlukan; ditemukan $(node -v)."
command -v npm >/dev/null 2>&1 || die "npm tidak ditemukan."
command -v curl >/dev/null 2>&1 || die "curl tidak ditemukan."
ok "Node.js $(node -v)"

info "Menginstal dependency Node.js + binary native yang di-whitelist..."
npm install --omit=dev
ok "Dependency Node.js siap."

export PATH="$LOCAL_BIN:$DIR/node_modules/.bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

engine_failures=0

if command -v agy >/dev/null 2>&1 && command_ok "$(command -v agy)"; then
  ln -sf "$(command -v agy)" "$LOCAL_BIN/agy"
  ok "Antigravity CLI: $("$(command -v agy)" --version 2>/dev/null | head -1)"
else
  warn "Antigravity CLI belum tersedia atau tidak executable."
  warn "Pasang dari dokumentasi resmi Google: https://www.antigravity.google/docs/cli/install/"
  engine_failures=$((engine_failures + 1))
fi

if [ -x "$DIR/node_modules/.bin/opencode" ] && command_ok "$DIR/node_modules/.bin/opencode"; then
  ln -sf "$DIR/node_modules/.bin/opencode" "$LOCAL_BIN/opencode"
  ok "OpenCode CLI: $("$LOCAL_BIN/opencode" --version 2>/dev/null | head -1)"
else
  warn "OpenCode CLI dependency tidak executable."
  engine_failures=$((engine_failures + 1))
fi

if [ -x "$DIR/node_modules/.bin/codex" ] && command_ok "$DIR/node_modules/.bin/codex"; then
  ok "OpenAI Codex CLI: $("$DIR/node_modules/.bin/codex" --version 2>/dev/null | head -1)"
else
  warn "OpenAI Codex CLI dependency tidak executable."
  engine_failures=$((engine_failures + 1))
fi

chmod +x "$DIR/cli.js" "$DIR/server.js" "$DIR/start.sh" "$DIR/install.sh" 2>/dev/null || true
chmod +x "$DIR/scripts/doctor.sh" "$DIR/scripts/smoke-test.sh" 2>/dev/null || true

if [ "$engine_failures" -gt 0 ] && [ "$ALLOW_PARTIAL_ENGINES" != "1" ]; then
  die "$engine_failures engine gagal health-check. Pasang prerequisite di atas atau gunakan ALLOW_PARTIAL_ENGINES=1 untuk mode parsial."
fi

printf '\n'
ok "Instalasi selesai dan seluruh engine yang diwajibkan lolos health-check."
printf 'Jalankan: ./start.sh\n'
printf 'Diagnostik: npm run doctor\n'
printf 'Smoke test: npm test\n'
