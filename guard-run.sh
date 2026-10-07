#!/usr/bin/env sh
set -eu

DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

cat >&2 <<EOF
guard-run.sh sudah deprecated di v2.

Runtime v2 tidak lagi mengadopsi proses arbitrer. Gunakan:
  $DIR/start.sh
untuk server aplikasi, atau ForegroundService/Terminal native pada Android.
EOF

exit 2
