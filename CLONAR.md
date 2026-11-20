# 📥 Cómo clonar y arrancar el bot

> ⚠️ **La sesión de WhatsApp NO va en el repo** (por seguridad). En cada dispositivo
> nuevo hay que vincular con el código de 8 dígitos.
> **Nunca subas** `.env`, `auth_info/` ni `storage/*.json` a GitHub: ya están en `.gitignore`.

---

## 1. Clonar

```bash
git clone https://github.com/jhondzn03-bit/BOT-CAPIBARA-SPAM.git
cd BOT-CAPIBARA-SPAM
```

## 2. Instalar dependencias y configurar

```bash
npm install
cp .env.example .env
nano .env
```

Deja estos valores en `.env`:

```env
BOT_PHONE_NUMBER=13322284862   # número del bot: código de país + número, sin + ni espacios
OWNER_NUMBER=50375638328       # tu número: único que puede mandar comandos
PROOF_NUMBER=50375638328       # recibe la imagen de comprobante de cada envío
```

> En `nano`: muevete con las flechas, edita, guarda con `Ctrl+O` + `Enter` y sal con `Ctrl+X`.

## 3. Vincular WhatsApp

```bash
npx tsx src/index.ts
```

Aparecerá algo así:

```
🔐 ✨ CÓDIGO DE VINCULACIÓN (8 DÍGITOS)
        1234-5678
```

Si no lo viste o ya cambió:

```bash
bash ver-codigo.sh
```

En el celular donde está el número del bot:

**WhatsApp → ⋮ → Dispositivos vinculados → Vincular con número de teléfono**
→ escribe los **8 dígitos sin guion ni espacios** (ej. `12345678`).

⚠️ Si WhatsApp dice *"este dispositivo no se pudo vincular"*, elimina un dispositivo
viejo de **Dispositivos vinculados** y vuelve a intentar. **No reinicies el bot mientras vinculas.**

## 4. Dejarlo corriendo en segundo plano

```bash
setsid nohup npm start > bot.log 2>&1 < /dev/null &
```

Comprueba que sigue vivo:

```bash
ps -ef | grep src/index.ts | grep -v grep
tail -f bot.log
```

## 5. Probar desde WhatsApp

Manda desde tu número (el de `OWNER_NUMBER`):

```text
.spam ayuda
.spam grupos
.spam enviados
```

---

## En Windows / Mac / Linux

Igual que arriba, pero instala **Node.js 20+** desde <https://nodejs.org> y omite
los comandos de Termux (`pkg install`). Todo lo demás es idéntico.

## Comandos útiles

| Comando | Para qué sirve |
|---|---|
| `bash ver-codigo.sh` | Ver el código de vinculación vigente |
| `bash ver-qr.sh` | Ver el QR de respaldo |
| `tail -f bot.log` | Ver la actividad en vivo |
| `pkill -f 'src/index.ts'` | Apagar el bot |
| `npm run typecheck` | Revisar errores de TypeScript |

## Actualizar el bot

```bash
git pull
npm install
pkill -f 'src/index.ts'
setsid nohup npm start > bot.log 2>&1 < /dev/null &
```
