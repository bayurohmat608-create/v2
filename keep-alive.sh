#!/bin/sh
# keep-alive.sh — Supervisor wakelock untuk SEMUA PID (bukan 1 PID saja).
#
# Cara pakai:
#   sh /public/keep-alive.sh start              -> adopsi semua proses yg ada + jaga semuanya
#   sh /public/keep-alive.sh status             -> lihat SEMUA proses yang dijaga
#   sh /public/keep-alive.sh stop               -> HENTIKAN SEMUA (satu-satunya cara manual global)
#   sh /public/keep-alive.sh stop <nama>        -> hentikan 1 layanan saja
#   sh /public/keep-alive.sh start <nama>       -> hidupkan lagi 1 layanan
#   sh /public/keep-alive.sh restart [nama]     -> restart semua / 1 layanan
#   sh /public/keep-alive.sh add <nama> <cmd..> -> daftarkan + jalankan proses BARU (masa depan)
#   sh /public/keep-alive.sh adopt               -> adopsi ulang proses yang sudah ada sekarang
#   sh /public/keep-alive.sh list               -> daftar registry
#
# Aturan:
# - 1 STOP file global (.wakelock_stop) = kamu sendiri yang mematikan. Selama TIDAK ada,
#   watchdog menghidupkan lagi apa pun yang mati (kill -9 / LMK Android / crash) max 15 detik.
# - Proses baru yang dijalankan via guard-run.sh otomatis masuk registry -> otomatis dijaga.
# - Anti respawn-loop: max 4 restart / 5 menit per layanan, selebihnya COOLDOWN 10 menit.
# - Format registry supervised.conf per baris: name|pid|start_cmd|cwd|restart|check
#   check = "pid" atau "http:<url>"

DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
[ -z "$DIR" ] && DIR="/public"
PORT="${PORT:-3000}"
SERVER="$DIR/server.js"
GUARD="$DIR/guard-run.sh"
LOG="$DIR/wakelock.log"
REG="$DIR/supervised.conf"
PIDFILE_DOG="$DIR/.watchdog.pid"
PIDFILE_SERVER="$DIR/.server.pid"
STOPFILE="$DIR/.wakelock_stop"
HEARTBEAT="$DIR/.wakelock_heartbeat"

log() {
  _t="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$_t] $*" >> "$LOG"
  echo "$*"
}

pid_alive() {
  [ -n "$1" ] && kill -0 "$1" 2>/dev/null
}

http_ok() {
  wget -qO- --timeout=3 "$1" 2>/dev/null | grep -q "isRunning\|topic\|wakelock\|acquired\|ok\|OK"
  return $?
}

# --- registry helpers ---
reg_get() {
  grep "^$1|" "$REG" 2>/dev/null | head -n 1
}

reg_upsert() {
  # $1=name $2=pid $3=start_cmd $4=cwd $5=restart $6=check
  _n="$1"
  if [ -f "$REG" ]; then
    grep -v "^$_n|" "$REG" > "$REG.tmp" 2>/dev/null
    mv "$REG.tmp" "$REG" 2>/dev/null
  fi
  echo "$_n|$2|$3|$4|$5|$6" >> "$REG"
}

reg_set_pid() {
  _line="$(reg_get "$1")"
  [ -z "$_line" ] && return 1
  _cmd="$(echo "$_line" | cut -d'|' -f3)"
  _cwd="$(echo "$_line" | cut -d'|' -f4)"
  _rs="$(echo "$_line" | cut -d'|' -f5)"
  _ck="$(echo "$_line" | cut -d'|' -f6)"
  reg_upsert "$1" "$2" "$_cmd" "$_cwd" "$_rs" "$_ck"
}

reg_set_restart() {
  _line="$(reg_get "$1")"
  [ -z "$_line" ] && return 1
  _pid="$(echo "$_line" | cut -d'|' -f2)"
  _cmd="$(echo "$_line" | cut -d'|' -f3)"
  _cwd="$(echo "$_line" | cut -d'|' -f4)"
  _ck="$(echo "$_line" | cut -d'|' -f6)"
  reg_upsert "$1" "$_pid" "$_cmd" "$_cwd" "$2" "$_ck"
}

proc_cmdline() {
  # $1=pid -> "argv0 argv1 ..." (tanpa trailing space)
  if [ -f "/proc/$1/cmdline" ]; then
    tr '\0' ' ' < "/proc/$1/cmdline" 2>/dev/null | sed 's/ *$//'
  fi
}

proc_cwd() {
  readlink "/proc/$1/cwd" 2>/dev/null
  [ $? -ne 0 ] && echo "$DIR"
}

# --- cek 1 layanan: 0=hidup, 1=mati ---
check_one() {
  _line="$(reg_get "$1")"
  [ -z "$_line" ] && return 1
  _pid="$(echo "$_line" | cut -d'|' -f2)"
  _ck="$(echo "$_line" | cut -d'|' -f6)"
  case "$_ck" in
    http:*)
      _url="$(echo "$_ck" | sed 's/^http://')"
      if http_ok "$_url"; then return 0; fi
      # fallback ke pid bila http gagal tapi pid hidup (transien)
      if pid_alive "$_pid"; then return 0; fi
      return 1
      ;;
    *)
      pid_alive "$_pid"
      return $?
      ;;
  esac
}

# --- backoff: 0=boleh restart, 1=cooldown ---
restart_allowed() {
  _f="$DIR/.restart.$1"
  _c="$DIR/.cooldown.$1"
  _now="$(date +%s 2>/dev/null)"
  [ -z "$_now" ] && _now=0
  if [ -f "$_c" ]; then
    _ct="$(cat "$_c" 2>/dev/null)"
    if [ -n "$_ct" ] && [ $((_now - _ct)) -lt 600 ]; then
      return 1
    fi
    rm -f "$_c" "$_f"
  fi
  if [ -f "$_f" ]; then
    _kept=""
    _n=0
    for _t in $(cat "$_f" 2>/dev/null); do
      if [ $((_now - _t)) -lt 300 ]; then
        _kept="$_kept $_t"
        _n=$((_n + 1))
      fi
    done
    echo "$_kept" > "$_f"
    if [ "$_n" -ge 4 ]; then
      echo "$_now" > "$_c"
      log "⏳ [$1] restart 4x dalam 5 menit -> COOLDOWN 10 menit (cek perintahnya, mungkin langsung exit)."
      return 1
    fi
  fi
  return 0
}

record_restart() {
  _now="$(date +%s 2>/dev/null)"
  echo "${_now:-0} $(cat "$DIR/.restart.$1" 2>/dev/null)" > "$DIR/.restart.$1"
}

# --- restart 1 layanan ---
restart_one() {
  _name="$1"
  _line="$(reg_get "$_name")"
  [ -z "$_line" ] && return 1
  _pid="$(echo "$_line" | cut -d'|' -f2)"
  _cmd="$(echo "$_line" | cut -d'|' -f3)"
  _cwd="$(echo "$_line" | cut -d'|' -f4)"
  _rs="$(echo "$_line" | cut -d'|' -f5)"
  if [ "$_rs" != "yes" ]; then
    return 1
  fi
  if [ -f "$STOPFILE" ]; then
    return 1
  fi
  if ! restart_allowed "$_name"; then
    return 1
  fi
  if [ -z "$_cmd" ]; then
    log "⚠️ [$_name] tidak ada start_cmd — tidak bisa restart. Hapus/entri manual."
    return 1
  fi
  if pid_alive "$_pid"; then
    kill -9 "$_pid" 2>/dev/null
  fi
  # Bunuh juga anak yang tercatat (mencegah anak yatim bocor & menahan port)
  _chf="$DIR/.guard.$_name.child"
  if [ -f "$_chf" ]; then
    _ch="$(cat "$_chf" 2>/dev/null)"
    if [ -n "$_ch" ] && [ "$_ch" != "$$" ] && pid_alive "$_ch"; then
      kill -9 "$_ch" 2>/dev/null
    fi
    rm -f "$_chf"
  fi
  [ -d "$_cwd" ] || _cwd="$DIR"
  # NOTE: $_cmd sengaja tidak dikutip (word-splitting) agar "a b c" jadi argv. Hanya untuk perintah sederhana.
  # shellcheck disable=SC2086
  (cd "$_cwd" && setsid nohup sh "$GUARD" "$_name" $_cmd >> "$LOG" 2>&1 < /dev/null &) 
  sleep 2
  _np=""
  if [ -f "$DIR/.guard.$_name.pid" ]; then
    _np="$(cat "$DIR/.guard.$_name.pid" 2>/dev/null)"
  fi
  if [ -n "$_np" ] && pid_alive "$_np"; then
    reg_set_pid "$_name" "$_np"
    record_restart "$_name"
    rm -f "$DIR/.dead.$_name"
    if [ "$_name" = "server" ]; then
      echo "$_np" > "$PIDFILE_SERVER"
    fi
    log "🔄 [$_name] di-restart pid=$_np (cmd: $_cmd)"
    return 0
  fi
  record_restart "$_name"
  log "⚠️ [$_name] restart gagal (cmd: $_cmd). Cek wakelock.log"
  return 1
}

# --- adopsi proses yang SUDAH ADA ---
adopt_existing() {
  _added=0
  _watchdog_pid=""
  [ -f "$PIDFILE_DOG" ] && _watchdog_pid="$(cat "$PIDFILE_DOG" 2>/dev/null)"
  ps -o pid,args 2>/dev/null | tail -n +2 | while read -r _pid _rest; do
    case "$_pid" in ''|*[!0-9]*) continue ;; esac
    _args="$(proc_cmdline "$_pid")"
    [ -z "$_args" ] && continue
    case "$_args" in
      *keep-alive.sh*|*guard-run.sh*|*"ps -o"*|*"grep "*|node\ -e\ *) continue ;;
    esac
    # lewati sleeper milik watchdog sendiri
    if [ "$_args" = "sleep 15" ]; then
      _pp="$(cut -d' ' -f4 < "/proc/$_pid/stat" 2>/dev/null)"
      if [ -n "$_pp" ] && [ "$_pp" = "$_watchdog_pid" ]; then continue; fi
    fi
    _cwd="$(proc_cwd "$_pid")"
    case "$_args" in
      "agy")
        if [ -z "$(reg_get agy)" ]; then
          reg_upsert "agy" "$_pid" "agy" "$_cwd" "yes" "pid"
          echo "ADOPT agy pid=$_pid" >> "$LOG"
        fi
        ;;
      "opencode serve"*)
        if [ -z "$(reg_get opencode-serve)" ]; then
          reg_upsert "opencode-serve" "$_pid" "$_args" "$_cwd" "yes" "pid"
          echo "ADOPT opencode-serve pid=$_pid" >> "$LOG"
        fi
        ;;
      "opencode")
        # TUI interaktif: lacak saja, jangan auto-restart (restart headless salah).
        if [ -z "$(reg_get opencode-tui)" ]; then
          reg_upsert "opencode-tui" "$_pid" "opencode" "$_cwd" "no" "pid"
          echo "ADOPT opencode-tui pid=$_pid (track-only)" >> "$LOG"
        fi
        ;;
      "node /public/server.js")
        if [ -z "$(reg_get server)" ]; then
          reg_upsert "server" "$_pid" "node /public/server.js" "$_cwd" "yes" "http:http://127.0.0.1:$PORT/api/status"
          echo "$_pid" > "$PIDFILE_SERVER" 2>/dev/null
          echo "ADOPT server pid=$_pid" >> "$LOG"
        else
          reg_set_pid "server" "$_pid"
        fi
        ;;
    esac
  done
  # pastikan entri server ada walau prosesnya mati (agar watchdog menyalakannya)
  if [ -z "$(reg_get server)" ]; then
    reg_upsert "server" "" "node /public/server.js" "$DIR" "yes" "http:http://127.0.0.1:$PORT/api/status"
  fi
}

# --- autotrack: daftarkan proses layanan BARU yang muncul ---
autotrack() {
  _watchdog_pid=""
  [ -f "$PIDFILE_DOG" ] && _watchdog_pid="$(cat "$PIDFILE_DOG" 2>/dev/null)"
  ps -o pid,args 2>/dev/null | tail -n +2 | while read -r _pid _rest; do
    case "$_pid" in ''|*[!0-9]*) continue ;; esac
    _args="$(proc_cmdline "$_pid")"
    [ -z "$_args" ] && continue
    case "$_args" in
      *keep-alive.sh*|*guard-run.sh*|*"ps -o"*|node\ -e\ *|*"-p "*|*"--print"*|*"--prompt"*|*models*|*help*|*version*|*image-gen*|*chat-*|*web-search*|*browse*|*bg-updater*|*opencode\ run*|*"run "*|*codex*|*mcp*|*npm*|*npx*|*git*|*curl*|*wget*) continue ;;
    esac
    if [ "$_args" = "sleep 15" ]; then
      _pp="$(cut -d' ' -f4 < "/proc/$_pid/stat" 2>/dev/null)"
      if [ -n "$_pp" ] && [ "$_pp" = "$_watchdog_pid" ]; then continue; fi
    fi
    _base="$(echo "$_args" | cut -d' ' -f1)"
    _b="$(basename "$_base" 2>/dev/null)"
    case "$_b" in
      agy|opencode|node|python3|python|npm|npx|tsx|bun|deno|java)
        # sudah dikenal?
        _known=0
        if [ -f "$REG" ]; then
          while IFS='|' read -r _n _p _c _w _r _k; do
            if [ "$_p" = "$_pid" ]; then _known=1; break; fi
            # cocokkan start_cmd sama -> update pid (restart via guard idle?)
            if [ -n "$_c" ] && [ "$_c" = "$_args" ] && pid_alive "$_pid"; then
              reg_set_pid "$_n" "$_pid" 2>/dev/null
              _known=1
              break
            fi
          done < "$REG"
        fi
        if [ "$_known" -eq 0 ]; then
          case "$_args" in
            "opencode"|"agy"|*agy*|*python*|*python3*)
              _nn="$_b-tui-$_pid"
              reg_upsert "$_nn" "$_pid" "$_args" "$(proc_cwd "$_pid")" "no" "pid"
              log "👁️ autotrack: $_nn pid=$_pid (track-only)"
              ;;
            *)
              _safe="$(echo "$_args" | tr ' /' '__' | cut -c1-24)"
              _nn="auto-$_safe-$_pid"
              reg_upsert "$_nn" "$_pid" "$_args" "$(proc_cwd "$_pid")" "yes" "pid"
              log "👁️ autotrack: $_nn pid=$_pid cmd=$_args"
              ;;
          esac
        fi
        ;;
    esac
  done
}

watchdog_loop() {
  echo "$$" > "$PIDFILE_DOG"
  log "🐶 Supervisor-watchdog berjalan pid=$$ (cek SEMUA tiap 15 dtk)"
  while true; do
    sleep 15
    if [ -f "$STOPFILE" ]; then
      log "🛑 STOP global terdeteksi — watchdog berhenti, TIDAK restart (permintaan manual kamu)."
      rm -f "$PIDFILE_DOG"
      exit 0
    fi
    if [ -f "$REG" ]; then
      while IFS='|' read -r _n _p _c _w _r _k; do
        [ -z "$_n" ] && continue
        case "$_n" in \#*) continue ;; esac
        if check_one "$_n"; then
          rm -f "$DIR/.dead.$_n" 2>/dev/null
          # sinkronkan pid bila berubah (mis. restart manual di luar)
          if [ "$_r" = "yes" ] && [ -n "$_p" ] && ! pid_alive "$_p"; then
            : # check_one lolos via http — pid usang, biarkan
          fi
        else
          if [ "$_r" != "yes" ]; then
            if [ ! -f "$DIR/.dead.$_n" ]; then
              log "⚠️ [$_n] mati (track-only, restart=no). Hidupkan manual bila perlu."
              touch "$DIR/.dead.$_n"
            fi
          else
            log "⚠️ [$_n] mati (kemungkinan dibunuh Android/crash) — restart otomatis..."
            restart_one "$_n"
          fi
        fi
      done < "$REG"
    fi
    autotrack
  done
}

dog_running() {
  if [ -f "$PIDFILE_DOG" ]; then
    _d="$(cat "$PIDFILE_DOG" 2>/dev/null)"
    if [ -n "$_d" ] && pid_alive "$_d"; then
      return 0
    fi
    rm -f "$PIDFILE_DOG"
  fi
  return 1
}

start_dog_if_needed() {
  if ! dog_running; then
    setsid nohup sh "$0" _dog >> "$LOG" 2>&1 < /dev/null &
    log "🐶 Watchdog dinyalakan pid=$!"
  fi
}

do_start() {
  _only="$1"
  rm -f "$STOPFILE"
  touch "$REG" 2>/dev/null
  adopt_existing
  if [ -n "$_only" ]; then
    if [ -z "$(reg_get "$_only")" ]; then
      log "❌ Tidak ada layanan '$_only'. Lihat: sh $0 list"
      return 1
    fi
    reg_set_restart "$_only" "yes"
    if check_one "$_only"; then
      log "ℹ️ [$_only] sudah hidup."
    else
      restart_one "$_only"
    fi
    start_dog_if_needed
    return 0
  fi
  log "🔒 Wakelock GLOBAL aktif — adopsi + jaga SEMUA proses."
  # hidupkan yang mati (restart=yes)
  if [ -f "$REG" ]; then
    while IFS='|' read -r _n _p _c _w _r _k; do
      [ -z "$_n" ] && continue
      case "$_n" in \#*) continue ;; esac
      if [ "$_r" = "yes" ] && ! check_one "$_n"; then
        restart_one "$_n"
      fi
    done < "$REG"
  fi
  start_dog_if_needed
  log "✅ Supervisor aktif. Cek: sh $0 status"
}

do_stop() {
  _only="$1"
  if [ -n "$_only" ]; then
    _line="$(reg_get "$_only")"
    if [ -z "$_line" ]; then
      echo "❌ Tidak ada layanan '$_only'. Lihat: sh $0 list"
      return 1
    fi
    log "🔓 STOP manual [$_only] — set restart=no + bunuh."
    reg_set_restart "$_only" "no"
    _pid="$(echo "$_line" | cut -d'|' -f2)"
    if pid_alive "$_pid"; then
      kill "$_pid" 2>/dev/null
      sleep 2
      if pid_alive "$_pid"; then kill -9 "$_pid" 2>/dev/null; fi
    fi
    # Bunuh anak yang tercatat juga (jangan sisakan yatim)
    _chf="$DIR/.guard.$_only.child"
    if [ -f "$_chf" ]; then
      _ch="$(cat "$_chf" 2>/dev/null)"
      if [ -n "$_ch" ] && pid_alive "$_ch"; then
        kill "$_ch" 2>/dev/null
        sleep 1
        pid_alive "$_ch" && kill -9 "$_ch" 2>/dev/null
      fi
      rm -f "$_chf"
    fi
    # sapu anak guard-nya juga
    for _g in "$DIR/.guard.$_only.pid"; do
      [ -f "$_g" ] && rm -f "$_g"
    done
    log "✅ [$_only] berhenti. Hidupkan lagi: sh $0 start $_only"
    return 0
  fi
  log "🔓 Kamu meminta STOP GLOBAL — melepas wakelock & menghentikan SEMUA."
  touch "$STOPFILE"
  wget -qO- --timeout=3 --post-data='{"action":"release","reason":"keep-alive-stop"}' --header='Content-Type: application/json' "http://127.0.0.1:$PORT/api/wakelock" >> "$LOG" 2>&1
  sleep 1
  if [ -f "$REG" ]; then
    while IFS='|' read -r _n _p _c _w _r _k; do
      [ -z "$_n" ] && continue
      case "$_n" in \#*) continue ;; esac
      if pid_alive "$_p"; then
        log "Hentikan [$_n] pid=$_p ..."
        kill "$_p" 2>/dev/null
      fi
      _chf="$DIR/.guard.$_n.child"
      if [ -f "$_chf" ]; then
        _ch="$(cat "$_chf" 2>/dev/null)"
        pid_alive "$_ch" && kill "$_ch" 2>/dev/null
      fi
    done < "$REG"
    sleep 2
    while IFS='|' read -r _n _p _c _w _r _k; do
      [ -z "$_n" ] && continue
      case "$_n" in \#*) continue ;; esac
      if pid_alive "$_p"; then
        kill -9 "$_p" 2>/dev/null
      fi
      _chf="$DIR/.guard.$_n.child"
      if [ -f "$_chf" ]; then
        _ch="$(cat "$_chf" 2>/dev/null)"
        pid_alive "$_ch" && kill -9 "$_ch" 2>/dev/null
        rm -f "$_chf" "$DIR/.guard.$_n.pid"
      fi
    done < "$REG"
  fi
  if [ -f "$PIDFILE_SERVER" ]; then
    _p="$(cat "$PIDFILE_SERVER" 2>/dev/null)"
    pid_alive "$_p" && kill -9 "$_p" 2>/dev/null
    rm -f "$PIDFILE_SERVER"
  fi
  if dog_running; then
    _d="$(cat "$PIDFILE_DOG")"
    _me="$$"
    if [ "$_d" != "$_me" ]; then
      kill -9 "$_d" 2>/dev/null
      rm -f "$PIDFILE_DOG"
    else
      rm -f "$PIDFILE_DOG"
      exit 0
    fi
  fi
  log "✅ Semua berhenti. Nyalakan lagi: sh $0 start"
}

do_status() {
  echo "--- STATUS WAKELOCK GLOBAL ---"
  if [ -f "$STOPFILE" ]; then
    echo "STOP global: ADA (semua boleh mati)"
  else
    echo "STOP global: TIDAK ADA (wakelock menahan SEMUA — hanya manual stop)"
  fi
  if dog_running; then
    echo "Watchdog: $(cat "$PIDFILE_DOG") (JAGA, cek tiap 15 dtk)"
  else
    echo "Watchdog: MATI (tidak ada yang menjaga! jalankan: sh $0 start)"
  fi
  echo ""
  echo "--- LAYANAN TERDAFTAR (semua pid) ---"
  if [ ! -f "$REG" ] || [ ! -s "$REG" ]; then
    echo "(kosong — jalankan: sh $0 adopt)"
  else
    while IFS='|' read -r _n _p _c _w _r _k; do
      [ -z "$_n" ] && continue
      case "$_n" in \#*) continue ;; esac
      if check_one "$_n"; then _st="HIDUP"; else _st="MATI "; fi
      if [ -f "$DIR/.cooldown.$_n" ]; then _st="$_st (COOLDOWN)"; fi
      printf "%-16s pid=%-7s [%s] restart=%-3s check=%s\n  cmd: %s\n" "$_n" "${_p:--}" "$_st" "$_r" "$_k" "$_c"
    done < "$REG"
  fi
  echo ""
  echo "--- HTTP server ---"
  if http_ok "http://127.0.0.1:$PORT/api/status"; then
    echo "http://localhost:$PORT/api/status : OK"
    wget -qO- --timeout=3 "http://127.0.0.1:$PORT/api/wakelock" 2>/dev/null
    echo ""
  else
    echo "http://localhost:$PORT/api/status : TIDAK MERESPON"
  fi
}

do_add() {
  _name="$1"
  shift
  if [ -z "$_name" ] || [ $# -eq 0 ]; then
    echo "Pakai: sh $0 add <nama> <perintah...>"
    echo "Contoh: sh $0 add worker node /public/worker.js"
    return 1
  fi
  rm -f "$STOPFILE"
  reg_upsert "$_name" "" "$*" "$(pwd)" "yes" "pid"
  log "➕ Daftarkan [$_name]: $*"
  restart_one "$_name"
  start_dog_if_needed
}

do_list() {
  if [ -f "$REG" ] && [ -s "$REG" ]; then
    cat "$REG"
  else
    echo "(registry kosong)"
  fi
}

case "$1" in
  start) do_start "$2" ;;
  stop) do_stop "$2" ;;
  restart)
    if [ -n "$2" ]; then
      _ln="$(reg_get "$2")"
      _pid="$(echo "$_ln" | cut -d'|' -f2)"
      reg_set_restart "$2" "yes"
      rm -f "$STOPFILE" "$DIR/.cooldown.$2" "$DIR/.restart.$2"
      pid_alive "$_pid" && kill -9 "$_pid" 2>/dev/null
      sleep 1
      restart_one "$2"
      start_dog_if_needed
    else
      do_stop
      sleep 2
      rm -f "$STOPFILE"
      do_start
    fi
    ;;
  status) do_status ;;
  add) shift; do_add "$@" ;;
  guard) shift; do_add "$@" ;;
  adopt) adopt_existing; autotrack; log "✅ Adopsi selesai."; do_list ;;
  list) do_list ;;
  _dog) watchdog_loop ;;
  *) echo "Pakai: sh $0 {start [nama]|stop [nama]|status|restart [nama]|add <nama> <cmd>|adopt|list}"; exit 1 ;;
esac
