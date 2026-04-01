// =============================================
// src/app/auth/login/page.tsx
// Server Component — exporta metadata y delega al cliente
// =============================================

import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
