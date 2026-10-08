#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPO="${1:-bayurohmat608-create/v2}"
TAG="${2:-v2.0.0}"
TITLE="${3:-WhatsApp AI Team v2}"
shift $(( $# >= 3 ? 3 : $# ))
ASSETS=("$@")

command -v git >/dev/null 2>&1 || { echo "[ERROR] git tidak ditemukan." >&2; exit 1; }
command -v gh >/dev/null 2>&1 || {
  echo "[ERROR] GitHub CLI (gh) diperlukan untuk publish release." >&2
  echo "Login lebih dulu dengan: gh auth login" >&2
  exit 1
}

gh auth status >/dev/null 2>&1 || {
  echo "[ERROR] GitHub CLI belum login. Jalankan: gh auth login" >&2
  exit 1
}

if [ -n "$(git status --porcelain)" ]; then
  echo "[ERROR] Working tree belum bersih. Commit/stash perubahan sebelum release." >&2
  exit 1
fi

echo "[*] Menjalankan verifikasi sebelum release..."
npm run doctor
npm test

echo "[*] Push branch aktif ke origin..."
git push origin HEAD

NOTES="WhatsApp AI Team v2

- Runtime state terisolasi di .runtime/
- Engine health-check: OpenCode, Codex
- Android target API 36
- Raw terminal HTTP dinonaktifkan; Android memakai terminal native
- Smoke test dan Android build diverifikasi sebelum rilis"

if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "[*] Release $TAG sudah ada; metadata dipertahankan."
else
  gh release create "$TAG"     --repo "$REPO"     --target main     --title "$TITLE"     --notes "$NOTES"
fi

for asset in "${ASSETS[@]}"; do
  [ -f "$asset" ] || { echo "[ERROR] Asset tidak ditemukan: $asset" >&2; exit 1; }
  gh release upload "$TAG" "$asset" --repo "$REPO" --clobber
done

echo "[✓] Release siap: $REPO@$TAG"
