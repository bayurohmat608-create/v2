#!/usr/bin/env bash
# ==============================================================================
# WhatsApp AI Team (Budi & Rian) — Automated Instant Installer
# License: Apache 2.0
# ==============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

REPO_OWNER="${GITHUB_OWNER:-bayurohmat608-create}"
REPO_NAME="${GITHUB_REPO:-chat-your-agent-partner-like-human-partner}"
RELEASE_TAG="${RELEASE_TAG:-v1.0.0}"
ASSET_XZ="whatsapp-ai-engines-${RELEASE_TAG}-linux-arm64.tar.xz"
ASSET_GZ="whatsapp-ai-engines-${RELEASE_TAG}-linux-arm64.tar.gz"

echo -e "\033[1;36m================================================================="
echo -e "🚀 Memulai Instalasi Otomatis WhatsApp AI Team (Budi & Rian)"
echo -e "   Lisensi: Apache License 2.0"
echo -e "=================================================================\033[0m"

# 1. Cek Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "\033[1;31m[ERROR] Node.js belum terpasang!\033[0m"
  echo "Silakan pasang Node.js v18+ terlebih dahulu (cth: pkg install nodejs / apt install nodejs / apk add nodejs)."
  exit 1
fi
echo -e "\033[32m[✓] Node.js terdeteksi: $(node -v)\033[0m"

# 2. Setup Folder Lingkungan & Workspace
echo -e "\033[34m[*] Menyiapkan workspace dan folder penyimpanan...\033[0m"
mkdir -p /opt/workspaces/budi 2>/dev/null || mkdir -p "$DIR/workspaces/budi"
mkdir -p /opt/workspaces/rian 2>/dev/null || mkdir -p "$DIR/workspaces/rian"
mkdir -p "$DIR/auth_vault/antigravity" "$DIR/auth_vault/codex"
mkdir -p "$DIR/chat_files"
mkdir -p "$DIR/.local/bin"

# 3. Otomatis Ekstrak Engine AI
EXTRACT_TARGET="$DIR/.local/bin"

extract_engines() {
  local archive="$1"
  echo -e "\033[33m[*] Mengekstrak engine AI dari arsip ($archive)...\033[0m"
  tar -xf "$archive" -C "$EXTRACT_TARGET"
  chmod +x "$EXTRACT_TARGET"/* 2>/dev/null || true
  echo -e "\033[32m[✓] Engine AI (agy & opencode) berhasil diekstrak dan siap pakai!\033[0m"
}

if [ -f "$EXTRACT_TARGET/agy" ] && [ -f "$EXTRACT_TARGET/opencode" ]; then
  echo -e "\033[32m[✓] Engine AI sudah terpasang di $EXTRACT_TARGET\033[0m"
elif [ -f "$DIR/$ASSET_XZ" ]; then
  extract_engines "$DIR/$ASSET_XZ"
elif [ -f "$DIR/$ASSET_GZ" ]; then
  extract_engines "$DIR/$ASSET_GZ"
else
  # Unduh dari GitHub Release jika arsip lokal belum ada
  echo -e "\033[33m[*] Mengunduh paket engine AI terkompresi dari GitHub Release ($RELEASE_TAG)...\033[0m"
  DOWNLOAD_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${RELEASE_TAG}/${ASSET_XZ}"
  
  if curl -sSL -f -o "$DIR/$ASSET_XZ" "$DOWNLOAD_URL" 2>/dev/null; then
    extract_engines "$DIR/$ASSET_XZ"
  else
    # Fallback ke .tar.gz jika .tar.xz tidak ditemukan di release
    DOWNLOAD_URL_GZ="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${RELEASE_TAG}/${ASSET_GZ}"
    if curl -sSL -f -o "$DIR/$ASSET_GZ" "$DOWNLOAD_URL_GZ" 2>/dev/null; then
      extract_engines "$DIR/$ASSET_GZ"
    else
      echo -e "\033[33m[!] Info: Arsip rilis online belum tersedia di URL ini.\033[0m"
      echo -e "    Jika engine sudah ada di sistem host, aplikasi tetap dapat menggunakan engine bawaan."
    fi
  fi
fi

# 4. Beri Izin Eksekusi Skrip
chmod +x "$DIR/cli.js" "$DIR/server.js" "$DIR/start.sh" "$DIR/install.sh" 2>/dev/null || true

# 5. Pasang dependensi npm jika node_modules belum lengkap
if [ ! -d "$DIR/node_modules" ] && [ -f "$DIR/package.json" ]; then
  echo -e "\033[34m[*] Menginstal dependensi Node.js bawaan...\033[0m"
  npm install --production 2>/dev/null || true
fi

echo -e "\n\033[1;32m================================================================="
echo -e "✅ INSTALASI SELESAI & SELURUH ENGINE SIAP PAKAI!"
echo -e "=================================================================\033[0m"
echo -e "Jalankan langsung di terminal Anda:"
echo -e "  1. \033[1;36mMode Terminal TUI (Chat WhatsApp di Layar Konsol):\033[0m"
echo -e "     \033[1;33m./start.sh --terminal\033[0m  atau  \033[1;33mnode cli.js\033[0m"
echo -e ""
echo -e "  2. \033[1;36mMode Web WhatsApp (Lengkap UI v3.2 & Vault):\033[0m"
echo -e "     \033[1;33m./start.sh\033[0m  lalu buka di browser: \033[1;32mhttp://localhost:3000\033[0m"
echo -e "=================================================================\n"
