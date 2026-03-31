// =============================================
// src/lib/tus-upload.ts
// Lógica de subida resumable con tus-js-client + Supabase Storage
// Documentación TUS: https://tus.io/
// Documentación Supabase: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
// =============================================

import * as tus from "tus-js-client";
import type { TusUploadOptions } from "@/types";

// Tamaño de chunk OBLIGATORIO según Supabase: exactamente 6MB
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

// Bucket donde se guardan los WebM originales
const RAW_BUCKET = "raw-recordings";

/**
 * Sube un archivo usando el protocolo TUS (resumable).
 * Si se pierde la conexión, reanuda automáticamente desde donde quedó.
 */
export function uploadWithTus({
  file,
  fileName,
  recordingId,
  accessToken,
  onProgress,
  onSuccess,
  onError,
}: TusUploadOptions): tus.Upload {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const endpoint = `${supabaseUrl}/storage/v1/upload/resumable`;

  // Ruta del objeto dentro del bucket: user-recordings/{recordingId}/{fileName}
  const objectName = `recordings/${recordingId}/${fileName}`;

  const upload = new tus.Upload(file, {
    endpoint,
    // Tamaño de chunk fijo según requisito de Supabase Storage
    chunkSize: TUS_CHUNK_SIZE,
    // Reintenta hasta 5 veces con backoff exponencial
    retryDelays: [0, 3000, 5000, 10000, 20000],
    // Elimina el fingerprint al completar para no reutilizar uploads obsoletos
    removeFingerprintOnSuccess: true,
    // Almacena el fingerprint en localStorage para poder reanudar
    storeFingerprintForResuming: true,

    headers: {
      // Token del usuario autenticado (nunca el service role key)
      authorization: `Bearer ${accessToken}`,
      // Sobreescribe si ya existe (útil para reintentos)
      "x-upsert": "true",
    },

    // Metadata requerida por Supabase Storage
    metadata: {
      bucketName: RAW_BUCKET,
      objectName,
      contentType: "video/webm",
      // Metadata personalizada para trazabilidad
      recordingId,
      cacheControl: "3600",
    },

    // Callback de progreso: porcentaje calculado de bytes transferidos
    onProgress(bytesUploaded, bytesTotal) {
      const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
      onProgress(percentage);
    },

    onSuccess() {
      console.log(`[TUS] Upload completado: ${objectName}`);
      onSuccess(objectName);
    },

    onError(error) {
      console.error("[TUS] Error en upload:", error);
      onError(error as Error);
    },

    // Antes de empezar, intenta reanudar si hay un upload previo guardado
    onBeforeRequest(req) {
      // Aquí se podría añadir lógica adicional de autenticación dinámica
      // por ejemplo, refrescar el token si está próximo a expirar
    },
  });

  // Intenta encontrar un upload anterior para reanudar
  upload.findPreviousUploads().then((previousUploads) => {
    if (previousUploads.length > 0) {
      console.log(
        `[TUS] Reanudando upload anterior (${previousUploads.length} encontrados)`
      );
      upload.resumeFromPreviousUpload(previousUploads[0]);
    }
    upload.start();
  });

  return upload;
}

/**
 * Sube un archivo pequeño directamente (sin TUS).
 * Se usa cuando la grabación es corta y no supera los umbrales.
 */
export async function uploadDirect(
  file: Blob,
  fileName: string,
  recordingId: string,
  accessToken: string,
  onProgress: (pct: number) => void
): Promise<string> {
  const objectName = `recordings/${recordingId}/${fileName}`;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const url = `${supabaseUrl}/storage/v1/object/${RAW_BUCKET}/${objectName}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("content-type", "video/webm");
    xhr.setRequestHeader("x-upsert", "true");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(objectName);
      } else {
        reject(new Error(`Upload falló con status ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Error de red durante el upload"));
    xhr.send(file);
  });
}
