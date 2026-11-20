#!/usr/bin/env bash
# Sube los cambios a GitHub. El token se pide al momento y NO se guarda en el repo.
set -e
cd "$(dirname "$0")"

echo "🔑 Necesitas un Personal Access Token de GitHub con permiso 'repo'."
echo "   Crealo en: https://github.com/settings/tokens"
echo
read -s -p "Token de GitHub: " TOKEN
echo

git push --force "https://jhondzn03-bit:${TOKEN}@github.com/jhondzn03-bit/BOT-CAPIBARA-SPAM.git" master
unset TOKEN

echo "✅ Todo subido a https://github.com/jhondzn03-bit/BOT-CAPIBARA-SPAM"
