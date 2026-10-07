#!/bin/sh
# guard-run.sh — Peluncur berpelindung untuk SEMUA proses (masa depan).
# Pakai ini untuk setiap proses baru agar otomatis masuk pengawasan watchdog:
#   sh /public/guard-run.sh <nama> <perintah...>
# Contoh:
#   sh /public/guard-run.sh worker node /public/worker.js
#   sh /public/guard-run.sh api python3 /public/api.py
#
# Efek:
# - Menolak SIGTERM/SIGINT/SIGHUP selama wakelock aktif (kecuali .wakelock_stop ada)
# - Mendaftarkan diri ke /public/supervised.conf agar watchdog restart bila kena kill -9
# - Log ke /public/wakelock.log, pidfile ke /public/.guard.<nama>.pid

DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
[ -z "$DIR" ] && DIR="/public"
LOG="$DIR/wakelock.log"
STOPFILE="$DIR/.wakelock_stop"
REG="$DIR/supervised.conf"

NAME="$1"
shift
if [ -z "$NAME" ] || [ $# -eq 0 ]; then
  echo "Pakai: sh $0 <nama> <perintah...>"
  exit 1
fi

PIDFILE="$DIR/.guard.$NAME.pid"

glog() {
  _t="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$_t] [guard:$NAME] $*" >> "$LOG"
}

# Daftarkan ke registry (format: name|pid|start_cmd|cwd|restart|check)
register_self() {
  _cmd="$*"
  _cwd="$(pwd)"
  _line="$NAME|$$|$_cmd|$_cwd|yes|pid"
  mkdir -p "$DIR"
  if [ -f "$REG" ]; then
    grep -v "^$NAME|" "$REG" > "$REG.tmp" 2>/dev/null
    mv "$REG.tmp" "$REG" 2>/dev/null
  fi
  echo "$_line" >> "$REG"
  echo "$$" > "$PIDFILE"
  glog "terdaftar: $_cmd (cwd=$_cwd, pid=$$)"
}

# Perisai sinyal: tolak mati selama wakelock, kecuali STOP diminta (oleh kamu).
guard() {
  _sig="$1"
  if [ ! -f "$STOPFILE" ]; then
    glog "Menolak $_sig — wakelock aktif (pid=$$). Hanya manual stop yang bisa matikan."
    return 0
  fi
  glog "Menerima $_sig + STOP ada — teruskan ke anak & keluar."
  # Teruskan ke anak lalu keluar
  if [ -n "$CHILD" ]; then
    kill -"$_sig" "$CHILD" 2>/dev/null
  fi
  exit 0
}

trap 'guard TERM' TERM
trap 'guard INT' INT
trap 'guard HUP' HUP

register_self "$*"
glog "start: $*"

# Jalankan anak di foreground wrapper ini (wrapper yang di-setsid-kan oleh pemanggil).
"$@" &
CHILD=$!
echo "$CHILD" > "$DIR/.guard.$NAME.child" 2>/dev/null
glog "anak pid=$CHILD"
# Loop tunggu: bila wait kembali karena sinyal trap (wrapper menolak sinyal)
# padahal anak masih hidup, kembali menunggu — JANGAN keluar.
CODE=0
while kill -0 "$CHILD" 2>/dev/null; do
  wait $CHILD
  CODE=$?
done
glog "anak keluar kode=$CODE (pid=$CHILD)"
glog "anak keluar kode=$CODE (pid=$CHILD)"
# Jika keluar BUKAN karena permintaan manual, biarkan watchdog yang restart.
# Wrapper sendiri keluar; watchdog akan membaca registry & menyalakan lagi.
exit $CODE
