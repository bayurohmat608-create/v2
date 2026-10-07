#!/usr/bin/env bash
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
export CHAT_AI_RUNTIME_DIR="${CHAT_AI_RUNTIME_DIR:-$DIR/.runtime}"
export PATH="$DIR/.local/bin:$DIR/node_modules/.bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js tidak ditemukan. Jalankan ./install.sh terlebih dahulu." >&2
  exit 1
fi

if [ ! -d "$DIR/node_modules" ]; then
  echo "[*] Dependency belum ada; menjalankan installer..."
  "$DIR/install.sh"
fi

health_host="$HOST"
[ "$health_host" = "0.0.0.0" ] && health_host="127.0.0.1"
health_url="http://$health_host:$PORT/api/status"

server_ready() {
  curl -fsS "$health_url" >/dev/null 2>&1
}

if server_ready; then
  echo "[✓] Server backend sudah aktif di http://$HOST:$PORT"
else
  echo "[*] Memulai server backend di $HOST:$PORT..."
  : > "$DIR/server.log"
  HOST="$HOST" PORT="$PORT" nohup node "$DIR/server.js" >>"$DIR/server.log" 2>&1 &
  server_pid=$!
  printf '%s\n' "$server_pid" > "$DIR/.server.pid"

  ready=0
  for _ in $(seq 1 40); do
    if server_ready; then ready=1; break; fi
    if ! kill -0 "$server_pid" 2>/dev/null; then break; fi
    sleep 0.25
  done

  if [ "$ready" -ne 1 ]; then
    echo "[ERROR] Server gagal sehat setelah startup." >&2
    tail -80 "$DIR/server.log" >&2 || true
    exit 1
  fi
  echo "[✓] Backend sehat (pid=$server_pid)."
fi

if [ "${1:-}" = "--terminal" ] || [ "${1:-}" = "-t" ] || [ "${1:-}" = "terminal" ] || [ "${1:-}" = "cli" ]; then
  exec node "$DIR/cli.js"
fi

printf '\n===============================================================\n'
printf 'Tim AI Boss Bayu siap beroperasi.\n'
printf 'Web App : http://%s:%s\n' "$HOST" "$PORT"
printf 'Terminal: ./start.sh --terminal\n'
printf 'Health  : http://%s:%s/api/health\n' "$health_host" "$PORT"
printf '===============================================================\n\n'
