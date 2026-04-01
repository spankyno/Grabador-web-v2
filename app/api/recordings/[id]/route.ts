// =============================================
// src/app/api/recordings/[id]/route.ts
// DELETE — elimina registro en DB + archivos en Storage
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

function extractStoragePath(publicUrl: string, bucketName: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/object/public/${bucketName}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function DELETE(
  _request: NextRequest,
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

    const { data: recording, error: fetchError } = await adminClient
      .from("recordings")
      .select("id, user_id, raw_path, processed_url, thumbnail_url")
      .eq("id", id)
      .single();

    if (fetchError || !recording) {
      return NextResponse.json({ error: "Grabación no encontrada" }, { status: 404 });
    }
    if (recording.user_id !== user.id) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    // Eliminar WebM original
    if (recording.raw_path) {
      const { error: e } = await adminClient.storage
        .from("raw-recordings")
        .remove([recording.raw_path]);
      if (e) console.warn("[API] No se pudo eliminar raw:", e.message);
    }

    // Eliminar MP4 procesado
    if (recording.processed_url) {
      const path = extractStoragePath(recording.processed_url, "processed-recordings");
      if (path) {
        const { error: e } = await adminClient.storage
          .from("processed-recordings")
          .remove([path]);
        if (e) console.warn("[API] No se pudo eliminar MP4:", e.message);
      }
    }

    // Eliminar thumbnail
    if (recording.thumbnail_url) {
      const path = extractStoragePath(recording.thumbnail_url, "processed-recordings");
      if (path) {
        const { error: e } = await adminClient.storage
          .from("processed-recordings")
          .remove([path]);
        if (e) console.warn("[API] No se pudo eliminar thumbnail:", e.message);
      }
    }

    // Eliminar registro de la DB
    const { error: deleteError } = await adminClient
      .from("recordings")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[API] Error eliminando de DB:", deleteError);
      return NextResponse.json({ error: "Error al eliminar de la base de datos" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] Error en DELETE recording:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
