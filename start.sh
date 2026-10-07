#!/usr/bin/env bash
# ==============================================================================
# WhatsApp AI Team Launcher (Auto-Setup & Instant Run)
# License: Apache 2.0
# ==============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT="${PORT:-3000}"
export PATH="$DIR/.local/bin:$DIR/engines:/opt/ide-tools/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Auto-extract engine jika belum pernah diekstrak
if [ ! -f "$DIR/.local/bin/agy" ] && [ -f "$DIR/whatsapp-ai-engines-v1.0.0-linux-arm64.tar.xz" ]; then
  echo -e "\033[33m[*] Pertama kali dijalankan: Mengekstrak engine AI otomatis...\033[0m"
  mkdir -p "$DIR/.local/bin"
  tar -xf "$DIR/whatsapp-ai-engines-v1.0.0-linux-arm64.tar.xz" -C "$DIR/.local/bin"
  chmod +x "$DIR/.local/bin"/* 2>/dev/null || true
  echo -e "\033[32m[✓] Engine AI siap beroperasi!\033[0m"
fi

# Cek apakah server sudah berjalan
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/api/status" 2>/dev/null | grep -q "200"; then
  echo -e "\033[32m[✓] Server backend sudah aktif di http://localhost:${PORT}\033[0m"
else
  echo -e "\033[36m[*] Memulai server backend WhatsApp AI di port ${PORT}...\033[0m"
  node server.js > server.log 2>&1 &
  sleep 1.5
fi

# Jika argumen --terminal atau -t diberikan, langsung jalankan CLI TUI
if [ "$1" = "--terminal" ] || [ "$1" = "-t" ] || [ "$1" = "terminal" ] || [ "$1" = "cli" ]; then
  echo -e "\033[1;32m[✓] Meluncurkan WhatsApp AI Terminal TUI...\033[0m\n"
  node cli.js
else
  echo -e "\n\033[1;36m================================================================="
  echo -e "🟢 Tim AI Boss Bayu Siap Beroperasi!"
  echo -e "   • Akses Web App di: \033[1;32mhttp://localhost:${PORT}\033[1;36m"
  echo -e "   • Akses Terminal di: \033[1;33m./start.sh --terminal\033[1;36m atau \033[1;33mnode cli.js\033[1;36m"
  echo -e "=================================================================\033[0m\n"
fi
