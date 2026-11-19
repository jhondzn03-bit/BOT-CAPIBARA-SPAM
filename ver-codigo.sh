#!/usr/bin/env bash
# Muestra el código de vinculación vigente.
if [ -f codigo-vinculacion.txt ]; then
  echo "🦫 CÓDIGO DE VINCULACIÓN (sin espacios ni guiones):"
  head -1 codigo-vinculacion.txt | tr -d '\r'
  echo
  echo "SIN GUION: $(head -1 codigo-vinculacion.txt | tr -d '\r-' | tr -d ' ')"
else
  echo "⚠️ Aún no hay código. Espera unos segundos con el bot corriendo."
fi
