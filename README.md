# 🎥 Grabador Web

Herramienta de grabación de pantalla production-ready directamente desde el navegador. Graba, sube y procesa vídeos largos sin instalaciones.

## Arquitectura

```
Navegador (Next.js)
  ↓ MediaRecorder API + timeslice (chunks cada 20s)
  ↓ TUS resumable (>8min o >250MB) / Upload directo
Supabase Storage (raw-recordings)
  ↓ /api/recording-complete notifica al backend
QStash (cola de jobs)
  ↓ entrega job al Worker externo
Worker (Railway/Fly.io)
  ↓ FFmpeg: WebM → MP4 + thumbnail
Supabase Storage (processed-recordings)
  ↓ actualiza tabla `recordings` → status: "ready"
```

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 + React 19 |
| Auth | Supabase Auth (magic link, OAuth) |
| Storage | Supabase Storage (TUS resumable) |
| Base de datos | Supabase PostgreSQL |
| Cola de jobs | QStash (Upstash) |
| Worker | Node.js + Express + FFmpeg |
| Deploy frontend | Vercel |
| Deploy worker | Railway / Fly.io |

---

## Setup local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-usuario/grabador-web
cd grabador-web
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
# Editar .env.local con tus valores reales
```

### 3. Configurar Supabase

```bash
# Instalar CLI de Supabase
npm install -g supabase

# Inicializar (si no existe)
npx supabase init

# Aplicar migraciones
npx supabase db push

# Crear buckets de Storage (una vez)
# Ir al dashboard: Storage → New bucket
# Crear: raw-recordings (privado) y processed-recordings (privado)
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
# App disponible en http://localhost:3000
```

---

## Deploy en Vercel

1. Conectar repositorio en [vercel.com](https://vercel.com)
2. Añadir variables de entorno en **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `QSTASH_TOKEN`
   - `QSTASH_URL`
   - `WORKER_ENDPOINT`
3. Deploy automático en cada push a `main`

---

## Deploy del Worker

### Opción A: Railway (recomendado para empezar)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login y deploy
railway login
railway init
railway up --service worker
railway variables set NEXT_PUBLIC_SUPABASE_URL=...
railway variables set SUPABASE_SERVICE_ROLE_KEY=...
```

### Opción B: Fly.io

```bash
# Instalar flyctl
brew install flyctl

# Desde la carpeta worker/
cd worker
fly launch --name grabador-web-worker
fly secrets set NEXT_PUBLIC_SUPABASE_URL=...
fly secrets set SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
```

---

## Variables de entorno requeridas

### Vercel (frontend + API)
| Variable | Dónde obtenerla |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API ⚠️ secreta |
| `QSTASH_TOKEN` | Upstash → QStash → Console |
| `QSTASH_URL` | `https://qstash.upstash.io/v2/publish/` |
| `WORKER_ENDPOINT` | URL pública del worker en Railway/Fly |

### Worker (Railway/Fly)
| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Misma que en Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Misma que en Vercel |
| `PORT` | Puerto Express (default: 3001) |

---

## Estructura del proyecto

```
grabador-web/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Página principal con grabador
│   │   ├── layout.tsx                  # Layout raíz
│   │   ├── recordings/page.tsx         # Listado de grabaciones
│   │   ├── auth/
│   │   │   ├── login/page.tsx          # Login con magic link / OAuth
│   │   │   └── callback/route.ts       # Callback OAuth de Supabase
│   │   └── api/
│   │       ├── recording-complete/     # Notificación fin de subida → encola job
│   │       ├── recordings/             # Listado paginado de grabaciones
│   │       └── signed-url/             # Genera URLs firmadas para descarga
│   ├── components/
│   │   └── recorder/RecorderUI.tsx     # UI principal del grabador
│   ├── hooks/
│   │   └── useScreenRecorder.ts        # Hook con toda la lógica de grabación
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Cliente Supabase (navegador)
│   │   │   ├── server.ts               # Cliente Supabase (servidor + service role)
│   │   │   └── database.types.ts       # Tipos generados del esquema
│   │   ├── queue/
│   │   │   └── qstash.ts               # Encolar jobs con QStash
│   │   └── tus-upload.ts               # Upload resumable con TUS
│   ├── types/index.ts                  # Tipos TypeScript globales
│   └── middleware.ts                   # Refresh de sesión Supabase
├── worker/
│   ├── src/index.ts                    # Worker FFmpeg (servicio externo)
│   ├── Dockerfile                      # Imagen Docker con FFmpeg
│   ├── fly.toml                        # Config deploy Fly.io
│   ├── package.json
│   └── tsconfig.json
├── supabase/
│   └── migrations/
│       ├── 001_recordings.sql          # Tabla recordings + RLS
│       └── 002_storage_policies.sql    # Políticas de Storage
├── .env.example                        # Plantilla de variables de entorno
├── .gitignore
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Lógica de grabación

El hook `useScreenRecorder` implementa:

- **Timeslice** (20s): genera chunks periódicos para evitar acumulación en RAM
- **Detección automática de modo**: si la grabación supera **8 minutos** o **250 MB**, activa TUS resumable automáticamente
- **Reanudación TUS**: si se pierde la conexión durante la subida, `tus-js-client` reanuda desde el último byte confirmado usando el fingerprint en `localStorage`
- **Combinación de streams**: pantalla + audio del sistema + micrófono + cámara (opcionales)
- **Detección de codec**: VP9 > VP8 > H264 según soporte del navegador

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` nunca se expone al cliente
- RLS en PostgreSQL: usuarios solo acceden a sus propias grabaciones
- Políticas de Storage: `authenticated` solo puede escribir en `raw-recordings`; el worker usa `service_role` para `processed-recordings`
- URLs firmadas con expiración de 1 hora para descargas
- Firma QStash verificable en el worker para autenticar jobs

---

## Compatibilidad de navegadores

| Navegador | getDisplayMedia | MediaRecorder | TUS |
|-----------|:--------------:|:-------------:|:---:|
| Chrome 88+ | ✅ | ✅ | ✅ |
| Edge 88+ | ✅ | ✅ | ✅ |
| Firefox 52+ | ✅ | ✅ | ✅ |
| Safari 13+ | ⚠️ limitado | ✅ | ✅ |

> `getDisplayMedia` **no funciona en móviles** (restricción del W3C).
