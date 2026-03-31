// =============================================
// src/app/page.tsx
// Página principal — carga RecorderUI de forma dinámica
// (necesario porque usa APIs del navegador)
// =============================================

import dynamic from "next/dynamic";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grabador Web — Graba tu pantalla directamente desde el navegador",
  description:
    "Herramienta de grabación de pantalla profesional. Sin instalación, segura, con soporte para grabaciones largas.",
};

// Carga dinámica para evitar SSR de APIs del navegador (MediaRecorder, etc.)
const RecorderUI = dynamic(
  () => import("@/components/recorder/RecorderUI"),
  {
    ssr: false,
    loading: () => (
      <div className="loading-screen">
        <div className="loading-dot" />
        <p>Cargando grabador…</p>
      </div>
    ),
  }
);

export default function HomePage() {
  return (
    <main className="main-layout">
      <div className="page-header">
        <h1 className="page-title">Grabador Web</h1>
        <p className="page-subtitle">
          Graba tu pantalla directamente desde el navegador.
          <br />
          Sin instalaciones. Seguro. Soporta grabaciones largas.
        </p>
      </div>

      <RecorderUI
        options={{
          resumableThresholdMinutes: 8,
          resumableThresholdMB: 250,
          timesliceMs: 20_000,
          includeSystemAudio: true,
        }}
      />

      <footer className="page-footer">
        <a href="/recordings">Mis grabaciones</a>
        <span>·</span>
        <a href="/auth/login">Cuenta</a>
      </footer>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #080b12;
          --surface: #0f1117;
          --border: #1e2433;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --accent: #3b82f6;
        }

        html, body {
          background: var(--bg);
          color: var(--text-primary);
          min-height: 100vh;
          font-family: 'IBM Plex Mono', 'Fira Code', 'Courier New', monospace;
        }

        /* Importar fuente monoespaciada premium */
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

        .main-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 3rem 1rem 2rem;
          gap: 2rem;
        }

        .page-header {
          text-align: center;
          max-width: 560px;
        }

        .page-title {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 700;
          letter-spacing: -0.04em;
          color: var(--text-primary);
          margin-bottom: 0.6rem;
        }

        .page-subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.65;
        }

        .page-footer {
          display: flex;
          gap: 1rem;
          align-items: center;
          font-size: 0.8rem;
          color: #4b5563;
          padding-top: 0.5rem;
        }

        .page-footer a {
          color: #4b5563;
          text-decoration: none;
          transition: color 0.15s;
        }

        .page-footer a:hover { color: var(--text-secondary); }

        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 4rem;
          color: #4b5563;
          font-size: 0.85rem;
        }

        .loading-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #1e2433;
          animation: load-pulse 1s ease-in-out infinite;
        }

        @keyframes load-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  );
}
