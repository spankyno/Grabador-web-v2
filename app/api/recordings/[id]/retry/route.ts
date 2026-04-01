// =============================================
// src/app/api/recordings/[id]/retry/route.ts
// Reintenta encolar el job de procesamiento de una grabación
// que quedó en estado "error" o "raw"
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { enqueueProcessingJob } from "@/lib/queue/qstash";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();

    // Verificar que la grabación existe y pertenece al usuario
    const { data: recording, error } = await adminClient
      .from("recordings")
      .select("id, raw_path, user_id, status")
      .eq("id", id)
      .single();

    if (error || !recording) {
      return NextResponse.json({ error: "Grabación no encontrada" }, { status: 404 });
    }

    if (recording.user_id !== user.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    if (!recording.raw_path) {
      return NextResponse.json({ error: "No hay archivo para procesar" }, { status: 400 });
    }

    // Actualizar status a processing
    await adminClient
      .from("recordings")
      .update({
        status: "processing",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Reencolar el job
    await enqueueProcessingJob({
      recording_id: recording.id,
      raw_path: recording.raw_path,
      user_id: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] Error en retry:", err);
    return NextResponse.json({ error: "Error al reintentar" }, { status: 500 });
  }
}
