# =============================================
# worker/Dockerfile
# Imagen Docker para el worker de procesamiento de vídeo
# Deploy en Railway, Fly.io, o Render
# =============================================

# Usar imagen oficial de Node con FFmpeg preinstalado
# node:20-slim + instalamos ffmpeg del sistema operativo
FROM node:20-slim AS base

# Instalar FFmpeg y dependencias del sistema
RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Verificar instalación de FFmpeg
RUN ffmpeg -version | head -2

# ===== Build stage =====
FROM base AS builder

WORKDIR /app

# Copiar package files primero (caché de Docker)
COPY worker/package*.json ./
COPY worker/tsconfig.json ./

RUN npm ci

# Copiar código fuente
COPY worker/src ./src
# Tipos compartidos con el frontend
COPY src/types ./types

# Compilar TypeScript
RUN npm run build

# ===== Production stage =====
FROM base AS production

WORKDIR /app

# Solo dependencias de producción
COPY worker/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el build compilado
COPY --from=builder /app/dist ./dist

# Puerto del servidor Express
EXPOSE 3001

# Variables de entorno requeridas (se configuran en Railway/Fly)
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# PORT (opcional, default 3001)

# Healthcheck para Railway/Fly
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
