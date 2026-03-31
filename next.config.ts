// =============================================
// next.config.ts
// Configuración de Next.js 15
// =============================================

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Habilitar React strict mode para detectar problemas
  reactStrictMode: true,

  // Headers de seguridad para grabación de pantalla
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Necesario para que getDisplayMedia funcione en algunos navegadores
          {
            key: "Permissions-Policy",
            value: "display-capture=self, camera=self, microphone=self",
          },
          // Seguridad básica
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Excluir el worker del build de Next.js
  webpack(config) {
    // Soporte para Web Workers si fuera necesario
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
