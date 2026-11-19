# 🔐 Restaurar sesión de WhatsApp

El archivo `sesion-whatsapp.tar.gz` contiene la carpeta `auth_info/` con la
sesión ya vinculada de `𝓢𝓹𝓪𝓶𝓮𝓻𝓑𝔂𝓙𝓱𝓸𝓷!` (`+1 332 228 4862`).

> ⚠️ **Este repo es PRIVADO.** El archivo contiene credenciales de WhatsApp.
> **Nunca lo hagas público** ni compartas el token de GitHub. Si se filtra,
> alguien podría tomar control de la cuenta. Si eso pasa, desvincula todos los
> dispositivos desde WhatsApp y vuelve a vincular.

## En un dispositivo nuevo (después de borrar Termux)

```bash
# 1. Instala Termux, Node.js, git y GitHub CLI
pkg install -y nodejs-lts git gh

# 2. Inicia sesión en GitHub
gh auth login

# 3. Clona el repo
gh repo clone jhondzn03-bit/BOT-CAPIBARA-SPAM
cd BOT-CAPIBARA-SPAM

# 4. Instala dependencias
npm install

# 5. Restaura la sesión
bash restaurar-sesion.sh

# 6. Arranca el bot
npx tsx src/index.ts
```

Debe aparecer:

```
✅ Sesión restaurada en auth_info/
   Número: 13322284862:4@s.whatsapp.net | Nombre: 𝓢𝓹𝓪𝓶𝓮𝓻𝓑𝔂𝓙𝓱𝓸𝓷! | Registrado: true
🦫 ✅ Sesión iniciada como 𝓢𝓹𝓪𝓶𝓮𝓻𝓑𝔂𝓙𝓱𝓸𝓷!
```

## Si WhatsApp pide vincular de nuevo

Se ejecuta el flujo normal:

```bash
BOT_PHONE_NUMBER=13322284862 PAIRING_STANDARD=1 npx tsx src/index.ts
bash ver-codigo.sh
```

## Envío cada 3 minutos

La campaña y los grupos están en `storage/db.json`, que **sí está excluido**
del repo (`.gitignore`). Si al restaurar no aparecen, vuelve a crearlos:

```bash
.spam autorizar todos
.spam repetir todos 3m
```
