// =============================================
// src/lib/supabase/client.ts
// Cliente Supabase para el navegador (componentes cliente)
// Usa @supabase/ssr para manejar cookies correctamente
// =============================================

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Singleton para evitar múltiples instancias en el cliente
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
