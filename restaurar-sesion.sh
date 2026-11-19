#!/usr/bin/env bash
# Restaura la sesión de WhatsApp guardada en el repo.
# Úsalo después de clonar el repo en un dispositivo nuevo.
set -e
cd "$(dirname "$0")"

if [ ! -f sesion-whatsapp.tar.gz ]; then
  echo "❌ No encuentro sesion-whatsapp.tar.gz"
  exit 1
fi

tar -xzf sesion-whatsapp.tar.gz

if [ -f auth_info/creds.json ]; then
  echo "✅ Sesión restaurada en auth_info/"
  node -e "const c=require('./auth_info/creds.json');console.log('   Número:',c.me?.id,'| Nombre:',c.me?.name,'| Registrado:',c.registered)" 2>/dev/null || true
else
  echo "❌ La restauración falló: no aparece auth_info/creds.json"
  exit 1
fi
