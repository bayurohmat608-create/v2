#!/usr/bin/env bash
# ==============================================================================
# Script Otomatis: Push Repository & Upload Engine ke GitHub Releases
# Lisensi: Apache 2.0
# ==============================================================================
set -e

REPO_URL="$1"
GITHUB_TOKEN="$2"
TAG_NAME="${3:-v1.0.0}"
RELEASE_TITLE="${4:-WhatsApp AI Team v1.0.0 — Standalone Release}"
ASSET_FILE="/public/whatsapp-ai-engines-v1.0.0-linux-arm64.tar.xz"
ASSET_NAME="whatsapp-ai-engines-${TAG_NAME}-linux-arm64.tar.xz"

if [ -z "$REPO_URL" ] || [ -z "$GITHUB_TOKEN" ]; then
  echo -e "\033[1;31m[PENGGUNAAN]\033[0m"
  echo "  $0 <REPO_URL> <GITHUB_TOKEN> [TAG_NAME] [RELEASE_TITLE]"
  echo "Contoh:"
  echo "  $0 https://github.com/username/whatsapp-ai-team.git YOUR_TOKEN v1.0.0"
  exit 1
fi

# Parsing owner dan repo dari URL
REPO_PATH=$(echo "$REPO_URL" | sed -E 's|https://github.com/||; s|\.git$||')
OWNER=$(echo "$REPO_PATH" | cut -d'/' -f1)
REPO=$(echo "$REPO_PATH" | cut -d'/' -f2)

echo -e "\033[1;36m================================================================="
echo -e "🚀 Memulai Publikasi ke GitHub:"
echo -e "   Repository: $OWNER/$REPO"
echo -e "   Tag Rilis:  $TAG_NAME"
echo -e "   Lisensi:    Apache License 2.0"
echo -e "=================================================================\033[0m"

cd /public

# 1. Konfigurasi Git
echo -e "\033[34m[*] Menginisialisasi Git Repository lokal...\033[0m"
git config --global user.name "Boss Bayu" 2>/dev/null || true
git config --global user.email "bossbayu@local.ai" 2>/dev/null || true

if [ ! -d ".git" ]; then
  git init -b main
else
  git checkout -B main
fi

# 2. Stage dan Commit
echo -e "\033[34m[*] Menyiapkan commit kode sumber, web UI v3.2, lisensi Apache 2.0, dan Android shell...\033[0m"
git add .gitignore LICENSE README.md server.js cli.js start.sh install.sh package.json web/ personas/ android/ scripts/ guard-run.sh keep-alive.sh supervised.conf
git commit -m "feat: Initial release of WhatsApp AI Team (Budi & Rian) with Apache 2.0 License" || echo "Perubahan sudah di-commit."

# 3. Setup Remote dengan Token
AUTH_REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${OWNER}/${REPO}.git"
git remote remove origin 2>/dev/null || true
git remote add origin "$AUTH_REMOTE_URL"

echo -e "\033[34m[*] Melakukan git push ke branch main...\033[0m"
git push -u origin main --force

# 4. Buat GitHub Release via API
echo -e "\033[34m[*] Membuat GitHub Release ($TAG_NAME) melalui GitHub API...\033[0m"
RELEASE_PAYLOAD=$(cat <<EOF
{
  "tag_name": "$TAG_NAME",
  "target_commitish": "main",
  "name": "$RELEASE_TITLE",
  "body": "### 🚀 WhatsApp AI Team v1.0.0 Standalone Release\n\n- **Lisensi**: Apache License 2.0\n- **Antarmuka**: WhatsApp Web v3.2 & Terminal TUI Konsol\n- **Engine AI**: Google Antigravity, OpenAI Codex, Opencode\n- **Paket Engine**: Termasuk biner lengkap dalam aset rilis (113 MB)\n\n#### Cara Install Cepat di Terminal:\n\`\`\`bash\ngit clone https://github.com/$OWNER/$REPO.git\ncd $REPO\n./install.sh\n./start.sh --terminal\n\`\`\`",
  "draft": false,
  "prerelease": false
}
EOF
)

RELEASE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$OWNER/$REPO/releases" \
  -d "$RELEASE_PAYLOAD")

RELEASE_ID=$(echo "$RELEASE_RESPONSE" | grep -o '"id": [0-9]*' | head -1 | awk '{print $2}')

if [ -z "$RELEASE_ID" ]; then
  echo -e "\033[33m[!] Rilis mungkin sudah ada atau respons berbeda. Mencari release ID yang ada...\033[0m"
  RELEASE_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/$OWNER/$REPO/releases/tags/$TAG_NAME")
  RELEASE_ID=$(echo "$RELEASE_RESPONSE" | grep -o '"id": [0-9]*' | head -1 | awk '{print $2}')
fi

echo -e "\033[32m[✓] GitHub Release ID: $RELEASE_ID\033[0m"

# 5. Upload Asset Engine Besar (113 MB) ke GitHub Release
if [ -n "$RELEASE_ID" ] && [ -f "$ASSET_FILE" ]; then
  echo -e "\033[34m[*] Mengunggah paket engine kompresi tinggi ($ASSET_FILE - 79MB) ke GitHub Release...\033[0m"
  UPLOAD_URL="https://uploads.github.com/repos/$OWNER/$REPO/releases/$RELEASE_ID/assets?name=${ASSET_NAME}"

  curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/x-xz" \
    --data-binary @"$ASSET_FILE" \
    "$UPLOAD_URL" > /dev/null

  echo -e "\033[1;32m[✓] Berhasil mengunggah paket engine ke GitHub Releases!\033[0m"
fi

echo -e "\n\033[1;32m================================================================="
echo -e "🎉 SUKSES! PROYEK & ENGINE BERHASIL DI-PUSH KE GITHUB RELEASES!"
echo -e "   Repo: https://github.com/$OWNER/$REPO"
echo -e "   Rilis: https://github.com/$OWNER/$REPO/releases/tag/$TAG_NAME"
echo -e "=================================================================\033[0m\n"
