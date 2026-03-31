// =============================================
// src/app/api/signed-url/route.ts
// Genera URLs firmadas temporales para descargar grabaciones.
// La URL expira en 1 hora para seguridad.
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get("id");
    const type = searchParams.get("type") ?? "processed"; // "raw" | "processed"

    if (!recordingId) {
      return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
    }

    // Verificar usuario
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener el recording y verificar que pertenece al usuario
    const adminClient = createServiceRoleClient();
    const { data: recording, error } = await adminClient
      .from("recordings")
      .select("raw_path, processed_url, user_id")
      .eq("id", recordingId)
      .single();

    if (error || !recording) {
      return NextResponse.json({ error: "Grabación no encontrada" }, { status: 404 });
    }

    // Verificar propiedad (seguridad)
    if (recording.user_id !== user.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    let bucket: string;
    let path: string;

    if (type === "raw" && recording.raw_path) {
      bucket = "raw-recordings";
      path = recording.raw_path;
    } else if (type === "processed" && recording.processed_url) {
      // Si es URL pública directa, devolverla tal cual
      return NextResponse.json({ url: recording.processed_url });
    } else {
      return NextResponse.json({ error: "Ruta no disponible aún" }, { status: 404 });
    }

    // Generar URL firmada con 1 hora de expiración
    const { data: signedUrl, error: signError } = await adminClient
      .storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (signError || !signedUrl) {
      return NextResponse.json({ error: "Error generando URL firmada" }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (err) {
    console.error("[API] Error en signed-url:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
