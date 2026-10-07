#!/usr/bin/env bash
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
RUNTIME_DIR="${CHAT_AI_RUNTIME_DIR:-$DIR/.runtime}"
PIDFILE="$RUNTIME_DIR/server.pid"
STOPFILE="$RUNTIME_DIR/.wakelock_stop"
LOGFILE="$RUNTIME_DIR/supervisor.log"

mkdir -p "$RUNTIME_DIR"

server_url() {
  local host="$HOST"
  [ "$host" = "0.0.0.0" ] && host="127.0.0.1"
  printf 'http://%s:%s/api/status' "$host" "$PORT"
}

pid_alive() {
  [ -f "$PIDFILE" ] || return 1
  local pid
  pid="$(cat "$PIDFILE" 2>/dev/null || true)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

healthy() {
  curl -fsS "$(server_url)" >/dev/null 2>&1
}

start_server() {
  if healthy; then
    echo "[✓] Server sudah sehat di $(server_url)"
    return 0
  fi

  rm -f "$STOPFILE"
  HOST="$HOST" PORT="$PORT" CHAT_AI_RUNTIME_DIR="$RUNTIME_DIR" "$DIR/start.sh"
  sleep 0.5

  if [ -f "$DIR/.server.pid" ]; then
    mv "$DIR/.server.pid" "$PIDFILE"
  fi

  healthy || {
    echo "[ERROR] Server gagal health-check setelah start." >&2
    exit 1
  }
}

stop_server() {
  touch "$STOPFILE"

  if healthy; then
    curl -fsS -X POST       -H 'Content-Type: application/json'       -d '{"action":"release","reason":"keep-alive-stop"}'       "http://127.0.0.1:$PORT/api/wakelock" >/dev/null 2>&1 || true
  fi

  if pid_alive; then
    local pid
    pid="$(cat "$PIDFILE")"
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.1
    done
    kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$PIDFILE"
  echo "[✓] Server dihentikan."
}

status_server() {
  if healthy; then
    echo "[✓] Server sehat: $(server_url)"
    pid_alive && echo "PID: $(cat "$PIDFILE")"
    return 0
  fi
  echo "[!] Server tidak merespons."
  return 1
}

case "${1:-status}" in
  start) start_server ;;
  stop) stop_server ;;
  restart) stop_server; start_server ;;
  status) status_server ;;
  *)
    echo "Pakai: $0 {start|stop|restart|status}" >&2
    exit 2
    ;;
esac
