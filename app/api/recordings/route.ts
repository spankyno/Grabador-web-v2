// =============================================
// src/app/api/recordings/route.ts
// Lista las grabaciones del usuario actual con paginación
// =============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("recordings")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: "Error al obtener grabaciones" }, { status: 500 });
    }

    return NextResponse.json({
      recordings: data ?? [],
      total: count ?? 0,
      page,
    });
  } catch (err) {
    console.error("[API] Error en recordings:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
