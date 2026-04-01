// =============================================
// src/app/api/signed-url/route.ts
// Genera URLs firmadas con Content-Disposition: attachment
// para forzar descarga en lugar de reproducción en el navegador.
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

// Extrae la ruta relativa dentro de un bucket a partir de una URL pública de Supabase
function extractStoragePath(publicUrl: string, bucketName: string): string | null {
  try {
    const url = new URL(publicUrl);
    // Formato: /storage/v1/object/public/{bucket}/{path}
    const marker = `/object/public/${bucketName}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get("id");
    const type = searchParams.get("type") ?? "processed";

    if (!recordingId) {
      return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();
    const { data: recording, error } = await adminClient
      .from("recordings")
      .select("raw_path, processed_url, thumbnail_url, user_id, title")
      .eq("id", recordingId)
      .single();

    if (error || !recording) {
      return NextResponse.json({ error: "Grabación no encontrada" }, { status: 404 });
    }
    if (recording.user_id !== user.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    let bucket: string;
    let path: string;
    let filename: string;

    if (type === "raw" && recording.raw_path) {
      bucket = "raw-recordings";
      path = recording.raw_path;
      filename = `${recording.title ?? "grabacion"}.webm`;
    } else if (type === "processed" && recording.processed_url) {
      bucket = "processed-recordings";
      const extracted = extractStoragePath(recording.processed_url, bucket);
      if (!extracted) {
        return NextResponse.json({ error: "No se pudo extraer la ruta del archivo" }, { status: 500 });
      }
      path = extracted;
      filename = `${recording.title ?? "grabacion"}.mp4`;
    } else {
      return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
    }

    // Generar URL firmada con Content-Disposition: attachment para forzar descarga
    const { data: signedData, error: signError } = await adminClient
      .storage
      .from(bucket)
      .createSignedUrl(path, 3600, {
        download: filename,  // fuerza descarga con ese nombre de archivo
      });

    if (signError || !signedData) {
      console.error("[API] Error generando signed URL:", signError);
      return NextResponse.json({ error: "Error generando enlace de descarga" }, { status: 500 });
    }

    return NextResponse.json({ url: signedData.signedUrl });
  } catch (err) {
    console.error("[API] Error en signed-url:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
