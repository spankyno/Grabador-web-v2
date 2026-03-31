-- =============================================
-- supabase/migrations/001_recordings.sql
-- Esquema inicial para la tabla de grabaciones
-- Ejecutar: npx supabase db push
-- =============================================

-- Tipo enumerado para el estado de la grabación
CREATE TYPE recording_status AS ENUM ('raw', 'processing', 'ready', 'error');

-- Tabla principal de grabaciones
CREATE TABLE IF NOT EXISTS recordings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          recording_status NOT NULL DEFAULT 'raw',
  
  -- Rutas de almacenamiento en Supabase Storage
  raw_path        TEXT,           -- Ruta en bucket raw-recordings (relativa al bucket)
  processed_url   TEXT,           -- URL pública del MP4 procesado
  thumbnail_url   TEXT,           -- URL pública del thumbnail
  
  -- Metadatos de la grabación
  duration_seconds INTEGER,
  size_bytes       BIGINT,
  title            TEXT,
  
  -- Para debugging y soporte
  error_message    TEXT,
  
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recordings_updated_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security (RLS)
-- Los usuarios solo pueden ver/modificar sus propias grabaciones
-- =============================================

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Leer: solo las propias grabaciones
CREATE POLICY "recordings_select_own"
  ON recordings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insertar: solo para el propio usuario
CREATE POLICY "recordings_insert_own"
  ON recordings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Actualizar: solo las propias (el worker usa service_role que bypasea RLS)
CREATE POLICY "recordings_update_own"
  ON recordings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Eliminar: solo las propias
CREATE POLICY "recordings_delete_own"
  ON recordings
  FOR DELETE
  USING (auth.uid() = user_id);
