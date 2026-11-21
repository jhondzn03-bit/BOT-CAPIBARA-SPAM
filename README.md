# 🦫 𝐁𝐎𝐓 𝐂𝐀𝐏𝐈𝐁𝐀𝐑𝐀 𝐒𝐏𝐀𝐌

> 📥 ¿Vas a clonar el bot o cambiar de dispositivo? Sigue la guía completa:
> **[CLONAR.md](CLONAR.md)**. La sesión de WhatsApp no se incluye (seguridad): se vincula con código de 8 dígitos.

> Sistema profesional de **gestión de campañas y anuncios** para WhatsApp.
> TypeScript · Node.js · Baileys
>
> Paleta: 🤎 marrón · 🟤 beige · ⚪ crema · Tipografía Unicode · Menús organizados.

---

## ✨ Características

- 🔢 **Vinculación por código de 8 dígitos** (con QR como respaldo).
- 📌 **Gestión de destinos**: unirse a grupos, directorio, verificación, selección, autorización y exclusión.
- 📨 **Gestión de anuncios**: texto, imagen, video, audio, documento y sticker, con edición, previsualización y guardado.
- 🖼️ **Vista previa de links**: los anuncios con URL muestran la imagen del sitio (Open Graph) en alta calidad (se puede desactivar con `.spam vista <id> off`).
- 📸 **Comprobante de envío**: después de cada campaña se envía una imagen con la evidencia (grupos alcanzados, fallidos y omitidos) **solo al número configurado en `PROOF_NUMBER`**.
- 🔐 **Modelo de consentimiento**: las campañas **solo se envían a grupos autorizados y seleccionados**.
- 🛡️ **Anti-baneo**: retardo entre envíos, límite diario por grupo, límite por hora y límite de comandos por usuario.
- 🚫 **Anti-duplicados**: la misma campaña **no se reenvía al mismo grupo** hasta que pase el enfriamiento (2 min por defecto). Evita los típicos 2–3 mensajes seguidos en el mismo chat.
- 📊 **Auditoría** de todas las acciones.
- 💾 **Persistencia** en JSON con escritura atómica.
- 🔄 **Reconexión automática** ante caídas de conexión.
- 👁️ **Lectura automática**: marca como leídos los mensajes que llegan (`.spam autoread on|off`).

---

## 🚀 Instalación

> Guía paso a paso para clonar desde cero: **[CLONAR.md](CLONAR.md)**.

```bash
cd BOT-CAPIBARA-SPAM
npm install
cp .env.example .env
nano .env
```

Configura al menos:

```env
BOT_PHONE_NUMBER=5215512345678   # tu número, sin + ni espacios
OWNER_NUMBER=5215512345678       # tu número (owner)
```

### Ejecutar

```bash
npm run dev        # desarrollo (recarga automática)
npm start          # producción con tsx
npm run build      # compilar a dist/
npm run start:prod # ejecutar compilado
npm run typecheck  # verificar tipos
```

Al iniciar verás en consola:

```
🔐 ✨ CÓDIGO DE VINCULACIÓN (8 DÍGITOS)
        1234-5678
```

También se guarda en `codigo-vinculacion.txt`. En WhatsApp entra a
**Dispositivos vinculados → Vincular con número de teléfono** e ingresa el código
**sin espacios ni guiones** (8 caracteres seguidos). Puedes verlo en cualquier momento con:

```bash
bash ver-codigo.sh
```

Por defecto se usa un código **numérico de 8 dígitos**. Si WhatsApp no lo acepta,
define `PAIRING_STANDARD=1` para usar el código nativo de Baileys (8 caracteres),
que es el que WhatsApp espera oficialmente. Con `PAIRING_CODE=12345678` el código
numérico queda fijo y no cambia. También se muestra un QR de respaldo en consola.
Si dejas `BOT_PHONE_NUMBER` vacío, solo se muestra el QR.

> Si WhatsApp dice *"Este dispositivo no se pudo vincular"*: revisa que el número
> tenga código de país (ej. `13322284862`), que el código sea el vigente y que no
> hayas alcanzado el límite de dispositivos vinculados (WhatsApp permite 4; elimina
> uno desde *Dispositivos vinculados*). También puedes escanear el QR de respaldo.

---

## 📖 Comandos

Todos los comandos usan el prefijo `.spam` (configurable con `BOT_PREFIX`).

### 📌 DESTINOS

| Comando | Descripción |
|---|---|
| `.spam unir <link\|codigo>` | Unirse a un grupo mediante enlace/código de invitación |
| `.spam grupos` | Listar el directorio de grupos (sincroniza automáticamente) |
| `.spam grupo add <jid>` | Registrar un grupo manualmente |
| `.spam grupo remove <jid>` | Eliminar un grupo del directorio |
| `.spam grupo info <jid>` | Ficha detallada del grupo |
| `.spam grupo verificar <jid>` | Verificar que el bot sigue en el grupo |
| `.spam grupo seleccionar <jid>` | Activar/desactivar un grupo para campañas |
| `.spam grupo autorizar <jid>` | Autorizar envíos al grupo (consentimiento) |
| `.spam autorizar todos` | Autorizar **todos** los grupos de una vez |
| `.spam grupo excluir <jid>` | Revocar autorización / excluir |

> En `add/remove/info/verificar/seleccionar/autorizar/excluir` también puedes usar el
> **número de índice** mostrado por `.spam grupos`, el JID, el número de teléfono o parte del nombre.

> 📝 **Texto exacto:** los anuncios conservan el mensaje tal cual lo escribes:
> saltos de línea, párrafos, espacios, emojis y formato. Ejemplo:
>
> ```text
> .spam msg 🧡 Promo del día
>
> • Producto A  —  $10
> • Producto B  —  $20
>
> Escribe AQUÍ para pedir 🦫
> ```
>
> El anuncio se guarda y envía con ese mismo formato.

### 📨 ANUNCIOS

| Comando | Descripción |
|---|---|
| `.spam msg <texto>` | Crear anuncio de texto |
| `.spam imagen\|img\|foto [texto]` | Crear anuncio con imagen + texto (responde a la imagen o adjúntala) |

> **Imagen + texto:** adjunta la imagen al comando y escribe el texto, por ejemplo
> `.spam imagen Leguen al nuevo grupo` (con la imagen pegada). También puedes
> responder a una imagen con `.spam imagen Tu texto`. Si no escribes texto, se
> usa el caption original de la imagen respondida. El texto conserva saltos de línea.
| `.spam video [texto]` | Crear anuncio con video |
| `.spam audio` | Crear anuncio con audio |
| `.spam documento [texto]` | Crear anuncio con documento |
| `.spam sticker` | Crear anuncio con sticker |
| `.spam editar <id> <texto>` | Editar el texto/caption de una campaña |
| `.spam previsualizar <id>` | Previsualizar el anuncio y sus destinatarios |
| `.spam guardar <id> <nombre>` | Guardar/renombrar la campaña |
| `.spam boton <id> <texto> <url>` | Agregar botón CTA de enlace (texto) |
| `.spam vista <id> on\|off` | Activar/desactivar vista previa de enlaces |

### ⚙️ GENERALES

| Comando | Descripción |
|---|---|
| `.spam` / `.spam ayuda` | Menú principal (un solo mensaje) |
| `.spam comandos` | Lista completa de comandos |
| `.spam campanas` | Listar campañas |
| `.spam programar <id> <+2h>` | Programar envío automático |
| `.spam repetir <id\|todos> 3m` | **Enviar cada 3 minutos** (recurrente) |
| `.spam ajustes 1500 0` | Retardo y sin límite diario |
| `.spam autoread on\|off` | Leer mensajes automáticamente |
| `.spam programados` | Ver campañas programadas |
| `.spam cancelar <id>` | Cancelar una programación |
| `.spam enviar <id>` | Enviar campaña a grupos autorizados |
| `.spam detener` | 🛑 **Detener todos los envíos** (manuales y programados) |
| `.spam reanudar` | ✅ Reanudar los envíos |
| `.spam enviados [id]` | Ver cuántos mensajes envió el bot (total o por campaña) |
| `.spam estado` | Estado del sistema |
| `.spam auditoria` | Registro de auditoría |

> 🛑 **Parar todo**: `.spam detener` frena al instante los envíos manuales y los
> programados (incluso a mitad de una campaña). El estado se guarda, así que sigue
> detenido aunque reinicies el bot. `.spam reanudar` lo vuelve a activar y las
> programaciones pendientes se retoman sin haberse consumido. Solo lo puede usar
> el `OWNER_NUMBER` (si lo configuraste).

### Flujo recomendado

```text
.spam unir <link>
.spam grupo autorizar <jid>       ← consentimiento
.spam msg Promoción de temporada…
.spam guardar c_abc123 "Temporada"
.spam previsualizar c_abc123
.spam boton c_abc123 "Ver oferta" https://ejemplo.com
.spam autorizar todos
.spam enviar todos
.spam repetir todos 3m
.spam programados
```

> Para envíos cada 3 minutos usa `.spam repetir todos 3m`. Primero autoriza con
> `.spam autorizar todos`. El scheduler revisa cada 20 s. Si quieres más rapidez,
> ajusta con `.spam ajustes 1500 0 120000` (retardo, límite diario y anti-duplicados).

### 📊 Contar mensajes enviados

```text
.spam enviados          → total general y desglose por campaña
.spam enviados c_abc123 → detalle de una campaña ( total, último envío, grupos y hoy)
```

El total es acumulado: cada envío suma al contador de la campaña. Para campañas
antiguas se reconstruye desde la auditoría.

### 🚫 Evitar mensajes repetidos en el mismo chat

Cada envío queda registrado por **campaña + grupo**. Si la misma campaña ya fue enviada
a ese grupo hace menos de `GROUP_COOLDOWN_MS` (2 min por defecto), se omite y aparece en
el reporte como *omitido*. También se bloquean los envíos concurrentes y las programaciones
duplicadas de una misma campaña, que eran la causa de recibir 2 o 3 mensajes seguidos.

```bash
# Activar/cambiar el enfriamiento (milisegundos)
.spam ajustes 1500 0 120000

# Verlo
.spam estado

# Forzar un reenvío antes de que pase el tiempo
.spam reintentar            # todas las campañas
.spam reintentar c_abc123   # solo una campaña
```

> Si usas `.spam repetir todos 3m`, deja el cooldown en `120000` (2 min) o menos que
> el intervalo de repetición; de lo contrario el envío programado se omitirá.

> Para fechas absolutas usa `2026-12-25 18:30` o `25/12/2026 18:30` (hora local del dispositivo).

---

## 🛡️ Uso responsable

Este sistema está diseñado para **campañas con consentimiento**: solo envía a grupos que
has autorizado explícitamente con `.spam grupo autorizar`. Los límites integrados
(`SEND_DELAY_MS`, `MAX_SENDS_PER_GROUP_DAY`, `MAX_GROUPS_PER_CAMPAIGN`) ayudan a evitar
el bloqueo de la cuenta y el envío masivo no deseado.

Úsalo con mensajes permitidos por las políticas de WhatsApp y respeta las preferencias
de los administradores de cada grupo. Para comunicaciones comerciales a gran escala,
la **WhatsApp Business Platform** es la vía oficial y conforme.

---

## 🗂️ Estructura

```
src/
├── index.ts               # Entrada
├── config/                # Configuración + identidad visual
├── core/
│   ├── Client.ts          # Socket, código de 8 dígitos / QR, reconexión
│   └── Handler.ts         # Despachador de comandos
├── commands/
│   ├── destinos.ts
│   ├── anuncios.ts
│   ├── general.ts
│   └── index.ts
├── services/
│   ├── GroupService.ts
│   ├── CampaignService.ts
│   ├── MediaService.ts
│   └── BroadcastService.ts
├── storage/Store.ts       # Persistencia JSON + auditoría
├── ui/menus.ts            # Menús Unicode
├── types/                 # Tipos TypeScript
└── utils/                 # Logger, helpers, rate limiter
```

## 📄 Licencia

MIT
