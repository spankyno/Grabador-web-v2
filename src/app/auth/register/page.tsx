// =============================================
// src/app/auth/register/page.tsx
// Server Component — exporta metadata y delega al cliente
// =============================================

import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Crea tu cuenta gratuita en Grabador Web y guarda tus grabaciones en la nube.",
  alternates: { canonical: "/auth/register" },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
