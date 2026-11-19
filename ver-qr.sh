#!/usr/bin/env bash
# Muestra el ÚLTIMO código QR emitido por el bot (escanéalo de inmediato).
LOG="${1:-/data/data/com.termux/files/usr/tmp/opencode/capibara-pair5.log}"
if [ ! -f "$LOG" ]; then
  echo "No encuentro el log: $LOG"
  exit 1
fi
awk '/Respaldo: escanea/{buf=""} {buf=buf $0 "\n"} END{printf "%s", buf}' "$LOG"
