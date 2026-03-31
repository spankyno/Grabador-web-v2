// =============================================
// src/lib/supabase/client.ts
// Cliente Supabase para el navegador (componentes cliente)
// Usa @supabase/ssr para manejar cookies correctamente
// =============================================

import { createBrowserClient } from "@supabase/ssr";

// Sin genérico Database — evita el error "never" cuando los tipos
// manuales no coinciden exactamente con la versión de postgrest-js.
// Una vez ejecutes `npx supabase gen types typescript` puedes
// reintroducir el genérico con los tipos auto-generados.
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
