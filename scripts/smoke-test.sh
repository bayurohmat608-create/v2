#!/usr/bin/env bash
set -Eeuo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"
PORT="${SMOKE_PORT:-31991}"
HOST=127.0.0.1
LOG="${TMPDIR:-/tmp}/chat-ai-smoke-$PORT.log"
export PATH="$DIR/.local/bin:$DIR/node_modules/.bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

cleanup(){
  if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
    kill -9 "$pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

WAKELOCK_DISABLED=1 HOST="$HOST" PORT="$PORT" node server.js >"$LOG" 2>&1 &
pid=$!

ready=0
for _ in $(seq 1 60); do
  if curl -fsS "http://$HOST:$PORT/api/status" >/dev/null 2>&1; then ready=1; break; fi
  kill -0 "$pid" 2>/dev/null || break
  sleep 0.2
done
if [ "$ready" -ne 1 ]; then
  cat "$LOG" >&2
  echo "Smoke test: server gagal startup" >&2
  exit 1
fi

curl -fsS "http://$HOST:$PORT/" | grep -qi '<html' || { echo "Root HTML gagal"; exit 1; }
curl -fsS "http://$HOST:$PORT/api/status" > /tmp/chat-ai-status.json
curl -fsS "http://$HOST:$PORT/api/models" > /tmp/chat-ai-models.json
curl -fsS "http://$HOST:$PORT/api/health" > /tmp/chat-ai-health.json
curl -fsS "http://$HOST:$PORT/api/auth/vault" > /tmp/chat-ai-vault.json

node - <<'NODE'
const fs=require('fs');
const status=JSON.parse(fs.readFileSync('/tmp/chat-ai-status.json','utf8'));
const models=JSON.parse(fs.readFileSync('/tmp/chat-ai-models.json','utf8'));
const health=JSON.parse(fs.readFileSync('/tmp/chat-ai-health.json','utf8'));
const vault=JSON.parse(fs.readFileSync('/tmp/chat-ai-vault.json','utf8'));
if (!Array.isArray(models) || models.length < 1) throw new Error('model list kosong');
if (!status.chatsSummary || !status.wakelock) throw new Error('status payload tidak lengkap');
if (!health.ok) throw new Error('health endpoint tidak sehat: '+JSON.stringify(health));
for (const [name,e] of Object.entries(health.engines||{})) if (!e.ok) throw new Error(name+' engine gagal');
const raw=JSON.stringify(vault);
if (/sk-[A-Za-z0-9_-]{12,}/.test(raw) || /ya29\.[A-Za-z0-9_-]{12,}/.test(raw)) throw new Error('vault API membocorkan credential');
console.log('API + engine health + vault redaction: PASS');
NODE

echo "Smoke test: PASS"
