// =============================================
// src/app/api/recording-complete/route.ts
// Endpoint llamado cuando la subida TUS/directa termina.
// Actualiza la DB y encola el job de procesamiento de vídeo.
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { enqueueProcessingJob } from "@/lib/queue/qstash";
import type { RecordingCompletePayload } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar usuario autenticado
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // 2. Parsear y validar el payload
    let payload: RecordingCompletePayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Payload JSON inválido" },
        { status: 400 }
      );
    }

    const { recording_id, raw_path, duration_seconds, size_bytes } = payload;

    if (!recording_id || !raw_path) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: recording_id, raw_path" },
        { status: 400 }
      );
    }

    // 3. Actualizar/crear registro en la DB con service role (para bypasear RLS)
    const adminClient = createServiceRoleClient();

    const { error: dbError } = await adminClient
      .from("recordings")
      .upsert(
        {
          id: recording_id,
          user_id: user.id,
          status: "processing",
          raw_path,
          duration_seconds: duration_seconds ?? null,
          size_bytes: size_bytes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (dbError) {
      console.error("[API] Error actualizando DB:", dbError);
      return NextResponse.json(
        { error: "Error al actualizar base de datos" },
        { status: 500 }
      );
    }

    // 4. Encolar job de procesamiento
    try {
      const messageId = await enqueueProcessingJob({
        recording_id,
        raw_path,
        user_id: user.id,
        priority: 5,
      });

      console.log(
        `[API] Job encolado para recording ${recording_id}`,
        { messageId, user_id: user.id }
      );
    } catch (queueError) {
      console.error("[API] Error al encolar job:", queueError);
      // No fallamos la respuesta — el admin puede reencolar manualmente
      // pero sí lo registramos en la DB
      await adminClient
        .from("recordings")
        .update({
          error_message: "Error al encolar job de procesamiento",
          updated_at: new Date().toISOString(),
        })
        .eq("id", recording_id);
    }

    return NextResponse.json(
      {
        success: true,
        recording_id,
        message: "Grabación encolada para procesamiento",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API] Error inesperado en recording-complete:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
