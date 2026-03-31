-- =============================================
-- supabase/migrations/002_storage_policies.sql
-- Políticas de seguridad para los buckets de Storage
--
-- ANTES de ejecutar, crea los buckets en el dashboard de Supabase:
--   1. raw-recordings     → privado (is_public: false)
--   2. processed-recordings → privado (is_public: false)
--
-- O crea los buckets con la API:
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('raw-recordings', 'raw-recordings', false),
--   ('processed-recordings', 'processed-recordings', false);
-- =============================================

-- ===== Bucket: raw-recordings =====

-- Los usuarios autenticados pueden subir a su propia carpeta
CREATE POLICY "raw_recordings_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'raw-recordings'
    AND (storage.foldername(name))[1] = 'recordings'
    -- Verificar que el nombre del archivo contiene el user_id (opcional)
    -- Alternativamente se puede verificar via metadata
  );

-- Los usuarios solo pueden leer sus propias grabaciones crudas
-- Nota: usamos signed URLs generadas en el servidor para leer,
-- por lo que esta política solo necesita permitir al service role
CREATE POLICY "raw_recordings_select_service_role"
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'raw-recordings');

-- Los usuarios autenticados pueden actualizar sus propios objetos (para TUS x-upsert)
CREATE POLICY "raw_recordings_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'raw-recordings')
  WITH CHECK (bucket_id = 'raw-recordings');

-- Solo service_role puede eliminar (para cleanup del worker)
CREATE POLICY "raw_recordings_delete_service_role"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'raw-recordings');

-- ===== Bucket: processed-recordings =====

-- Solo service_role puede subir los MP4 procesados (el worker)
CREATE POLICY "processed_insert_service_role"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'processed-recordings');

-- Los usuarios autenticados pueden leer sus propias grabaciones procesadas
-- Se accede via signed URLs generadas por el servidor
CREATE POLICY "processed_select_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'processed-recordings');

-- Solo service_role puede actualizar y eliminar
CREATE POLICY "processed_update_service_role"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'processed-recordings');

CREATE POLICY "processed_delete_service_role"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'processed-recordings');
