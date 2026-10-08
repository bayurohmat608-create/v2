#!/usr/bin/env bash
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"
export PATH="$DIR/.local/bin:$DIR/node_modules/.bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
fail=0
pass(){ printf '[PASS] %s\n' "$*"; }
bad(){ printf '[FAIL] %s\n' "$*" >&2; fail=$((fail+1)); }
check_cmd(){
  local name="$1"
  if command -v "$name" >/dev/null 2>&1 && "$name" --version >/dev/null 2>&1; then
    pass "$name -> $(command -v "$name") ($("$name" --version 2>/dev/null | head -1))"
  else
    bad "$name tidak tersedia / tidak executable"
  fi
}
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
  if [ "$major" -ge 18 ]; then pass "Node.js $(node -v)"; else bad "Node.js harus v18+"; fi
else bad "Node.js tidak ada"; fi
command -v npm >/dev/null 2>&1 && pass "npm $(npm -v)" || bad "npm tidak ada"
command -v curl >/dev/null 2>&1 && pass "curl tersedia" || bad "curl tidak ada"
node --check server.js >/dev/null 2>&1 && pass "server.js syntax valid" || bad "server.js syntax error"
node --check cli.js >/dev/null 2>&1 && pass "cli.js syntax valid" || bad "cli.js syntax error"
[ -f web/index.html ] && pass "web/index.html ada" || bad "web/index.html hilang"
[ -f personas/ai-1-system.md ] && pass "persona Budi ada" || bad "persona Budi hilang"
[ -f personas/ai-2-system.md ] && pass "persona Rian ada" || bad "persona Rian hilang"
check_cmd opencode
check_cmd codex
if [ "$fail" -eq 0 ]; then
  printf '\nDoctor: SEMUA CHECK LULUS.\n'
else
  printf '\nDoctor: %d check gagal.\n' "$fail" >&2
fi
exit "$fail"
