// =============================================
// src/components/recorder/RecorderUI.tsx
// Componente principal de la interfaz de grabación
// UX moderna: preview en vivo, indicadores de estado, progreso
// =============================================

"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useScreenRecorder } from "@/hooks/useScreenRecorder";
import type { RecorderOptions } from "@/types";

// Formatea segundos como MM:SS o HH:MM:SS
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Colores y labels por estado
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; pulse: boolean }
> = {
  idle: { label: "Listo para grabar", color: "#6b7280", pulse: false },
  requesting: { label: "Solicitando permisos…", color: "#f59e0b", pulse: true },
  recording: { label: "Grabando", color: "#ef4444", pulse: true },
  paused: { label: "Pausado", color: "#f59e0b", pulse: false },
  stopping: { label: "Finalizando…", color: "#8b5cf6", pulse: true },
  uploading: { label: "Subiendo grabación…", color: "#3b82f6", pulse: true },
  processing: { label: "Procesando en servidor…", color: "#8b5cf6", pulse: true },
  ready: { label: "¡Grabación lista!", color: "#10b981", pulse: false },
  error: { label: "Error", color: "#ef4444", pulse: false },
};

interface RecorderUIProps {
  options?: RecorderOptions;
}

export default function RecorderUI({ options }: RecorderUIProps) {
  const {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    abortUpload,
    reset,
    screenStream,
  } = useScreenRecorder(options);

  const previewRef = useRef<HTMLVideoElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recOptions, setRecOptions] = useState<RecorderOptions>({
    includeMicrophone: false,
    includeCamera: false,
    includeSystemAudio: true,
  });

  // Conectar el stream de pantalla al elemento <video> de preview
  useEffect(() => {
    if (
      previewRef.current &&
      screenStream.current &&
      state.status === "recording"
    ) {
      previewRef.current.srcObject = screenStream.current;
    } else if (
      previewRef.current &&
      state.status !== "recording" &&
      state.status !== "paused"
    ) {
      previewRef.current.srcObject = null;
    }
  }, [state.status, screenStream]);

  const statusConfig = STATUS_CONFIG[state.status] ?? STATUS_CONFIG.idle;
  const isRecording = state.status === "recording";
  const isPaused = state.status === "paused";
  const isUploading = state.status === "uploading" || state.status === "processing";
  const isIdle = state.status === "idle" || state.status === "error";
  const isReady = state.status === "ready";

  const handleMainAction = () => {
    if (isIdle) startRecording();
    else if (isRecording || isPaused) stopRecording();
  };

  return (
    <div className="recorder-container">
      {/* ===== ENCABEZADO ===== */}
      <header className="recorder-header">
        <div className="recorder-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="2" />
            <circle
              cx="14"
              cy="14"
              r="6"
              fill={isRecording ? "#ef4444" : "currentColor"}
              className={isRecording ? "pulse-circle" : ""}
            />
          </svg>
          <span>Grabador Web</span>
        </div>
        <div className="status-badge" style={{ "--status-color": statusConfig.color } as React.CSSProperties}>
          {statusConfig.pulse && <span className="status-pulse" />}
          <span className="status-dot" />
          {statusConfig.label}
        </div>
      </header>

      {/* ===== PREVIEW DE PANTALLA ===== */}
      <div className="preview-area">
        {(isRecording || isPaused) ? (
          <>
            <video
              ref={previewRef}
              autoPlay
              muted
              playsInline
              className="preview-video"
            />
            {isPaused && (
              <div className="preview-overlay paused-overlay">
                <span>⏸ Pausado</span>
              </div>
            )}
          </>
        ) : isUploading ? (
          <div className="preview-placeholder uploading-state">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 32V16M24 16L16 24M24 16L32 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 36h32"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="upload-label">
              {state.status === "processing"
                ? "Procesando con FFmpeg en el servidor…"
                : state.uploadMode === "resumable"
                ? "Subida resumable TUS activa"
                : "Subiendo grabación…"}
            </p>
            {state.status === "uploading" && (
              <div className="progress-bar-wrapper">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${state.uploadProgress}%` }}
                />
                <span className="progress-label">{state.uploadProgress}%</span>
              </div>
            )}
            {state.status === "processing" && (
              <div className="processing-spinner">
                <div className="spinner" />
                <span>Esto puede tardar unos minutos…</span>
              </div>
            )}
          </div>
        ) : isReady ? (
          <div className="preview-placeholder ready-state">
            <div className="ready-icon">✓</div>
            <p>Grabación guardada correctamente</p>
            <a href="/recordings" className="btn-secondary">
              Ver mis grabaciones →
            </a>
          </div>
        ) : state.error ? (
          <div className="preview-placeholder error-state">
            <div className="error-icon">⚠</div>
            <p className="error-message">{state.error}</p>
            <button onClick={reset} className="btn-secondary">
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <div className="preview-placeholder idle-state">
            <div className="idle-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect
                  x="4"
                  y="12"
                  width="48"
                  height="34"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M52 24l8-6v28l-8-6V24z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <line x1="20" y1="56" x2="44" y2="56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="32" y1="46" x2="32" y2="56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p>Pulsa <strong>Grabar</strong> para seleccionar una pantalla o ventana</p>
          </div>
        )}
      </div>

      {/* ===== MÉTRICAS EN TIEMPO REAL ===== */}
      {(isRecording || isPaused) && (
        <div className="metrics-bar">
          <div className="metric">
            <span className="metric-label">Duración</span>
            <span className="metric-value timer">
              {formatDuration(state.durationSeconds)}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Tamaño</span>
            <span className="metric-value">{state.sizeMB} MB</span>
          </div>
          {state.durationSeconds >= (options?.resumableThresholdMinutes ?? 8) * 60 * 0.8 && (
            <div className="metric warning">
              <span className="metric-label">Modo</span>
              <span className="metric-value">TUS activo</span>
            </div>
          )}
        </div>
      )}

      {/* ===== CONTROLES PRINCIPALES ===== */}
      <div className="controls">
        {/* Botón principal de Grabar / Detener */}
        {!isUploading && !isReady && (
          <button
            className={`btn-record ${isRecording ? "btn-stop" : isPaused ? "btn-stop" : "btn-start"}`}
            onClick={handleMainAction}
            disabled={state.status === "requesting" || state.status === "stopping"}
            aria-label={isRecording || isPaused ? "Detener grabación" : "Iniciar grabación"}
          >
            {state.status === "requesting" || state.status === "stopping" ? (
              <div className="spinner sm" />
            ) : isRecording ? (
              <>
                <span className="btn-icon stop-icon">■</span>
                Detener
              </>
            ) : isPaused ? (
              <>
                <span className="btn-icon stop-icon">■</span>
                Finalizar
              </>
            ) : (
              <>
                <span className="btn-icon rec-dot">●</span>
                Grabar
              </>
            )}
          </button>
        )}

        {/* Pausa / Reanudar (solo durante grabación) */}
        {(isRecording || isPaused) && (
          <button
            className="btn-secondary"
            onClick={isPaused ? resumeRecording : pauseRecording}
            aria-label={isPaused ? "Reanudar" : "Pausar"}
          >
            {isPaused ? "▶ Reanudar" : "⏸ Pausar"}
          </button>
        )}

        {/* Cancelar subida */}
        {isUploading && state.status === "uploading" && (
          <button className="btn-danger" onClick={abortUpload}>
            Cancelar subida
          </button>
        )}

        {/* Reset si hay error o está listo */}
        {(state.error || isReady) && (
          <button className="btn-secondary" onClick={reset}>
            Nueva grabación
          </button>
        )}
      </div>

      {/* ===== OPCIONES AVANZADAS ===== */}
      {isIdle && (
        <div className="advanced-section">
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "▲" : "▼"} Opciones de audio y cámara
          </button>

          {showAdvanced && (
            <div className="advanced-options">
              <label className="option-row">
                <input
                  type="checkbox"
                  checked={recOptions.includeSystemAudio}
                  onChange={(e) =>
                    setRecOptions((p) => ({ ...p, includeSystemAudio: e.target.checked }))
                  }
                />
                <span>Audio del sistema / pestaña</span>
              </label>
              <label className="option-row">
                <input
                  type="checkbox"
                  checked={recOptions.includeMicrophone}
                  onChange={(e) =>
                    setRecOptions((p) => ({ ...p, includeMicrophone: e.target.checked }))
                  }
                />
                <span>Micrófono</span>
              </label>
              <label className="option-row">
                <input
                  type="checkbox"
                  checked={recOptions.includeCamera}
                  onChange={(e) =>
                    setRecOptions((p) => ({ ...p, includeCamera: e.target.checked }))
                  }
                />
                <span>Cámara (picture-in-picture)</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* ===== INFO TUS ===== */}
      {state.uploadMode === "resumable" && isUploading && (
        <p className="info-banner">
          🔄 Subida resumable activa — si pierdes la conexión, continuará automáticamente
        </p>
      )}

      <style jsx>{`
        .recorder-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          max-width: 780px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: 'IBM Plex Mono', 'Fira Code', monospace;
        }

        /* ---- Header ---- */
        .recorder-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .recorder-logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary, #f1f5f9);
          letter-spacing: -0.02em;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          padding: 0.3rem 0.75rem;
          border-radius: 999px;
          background: color-mix(in srgb, var(--status-color, #6b7280) 15%, transparent);
          border: 1px solid color-mix(in srgb, var(--status-color, #6b7280) 40%, transparent);
          color: var(--status-color, #6b7280);
          position: relative;
        }
        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--status-color, #6b7280);
        }
        .status-pulse {
          position: absolute;
          left: 0.75rem;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--status-color, #6b7280);
          animation: pulse-ring 1.4s ease-out infinite;
        }

        /* ---- Preview ---- */
        .preview-area {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 12px;
          overflow: hidden;
          background: #0f1117;
          border: 1.5px solid #1e2433;
        }
        .preview-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }
        .preview-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.5);
          color: #fff;
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .preview-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
          text-align: center;
        }
        .idle-state { color: #4b5563; }
        .idle-icon { opacity: 0.35; }
        .idle-state p { color: #6b7280; font-size: 0.9rem; max-width: 300px; }
        .idle-state strong { color: #9ca3af; }

        /* ---- Upload state ---- */
        .uploading-state { color: #93c5fd; }
        .upload-icon { opacity: 0.7; animation: float 2s ease-in-out infinite; }
        .upload-label { font-size: 0.88rem; color: #93c5fd; }
        .progress-bar-wrapper {
          position: relative;
          width: 100%;
          max-width: 320px;
          height: 8px;
          background: #1e2433;
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 99px;
          transition: width 0.4s ease;
        }
        .progress-label {
          position: absolute;
          right: 0;
          top: 14px;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .processing-spinner {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.82rem;
          color: #818cf8;
        }

        /* ---- Ready state ---- */
        .ready-state { color: #10b981; gap: 0.75rem; }
        .ready-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          border: 2px solid #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
        }
        .ready-state p { color: #a7f3d0; font-size: 0.9rem; }

        /* ---- Error state ---- */
        .error-state { color: #f87171; }
        .error-icon {
          font-size: 2.5rem;
          opacity: 0.8;
        }
        .error-message { font-size: 0.85rem; color: #fca5a5; max-width: 320px; }

        /* ---- Metrics ---- */
        .metrics-bar {
          display: flex;
          gap: 1.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          border: 1px solid #1e2433;
        }
        .metric { display: flex; flex-direction: column; gap: 0.15rem; }
        .metric-label { font-size: 0.68rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }
        .metric-value { font-size: 1rem; font-weight: 600; color: #e2e8f0; font-variant-numeric: tabular-nums; }
        .metric-value.timer { color: #ef4444; font-size: 1.1rem; }
        .metric.warning .metric-value { color: #f59e0b; }

        /* ---- Controls ---- */
        .controls {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .btn-record {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 2rem;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          font-family: inherit;
          border: none;
          cursor: pointer;
          transition: all 0.18s;
          letter-spacing: 0.01em;
        }
        .btn-record:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-start {
          background: #ef4444;
          color: #fff;
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        }
        .btn-start:hover:not(:disabled) {
          background: #dc2626;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
          transform: translateY(-1px);
        }
        .btn-stop {
          background: #1e2433;
          color: #e2e8f0;
          border: 1.5px solid #374151;
        }
        .btn-stop:hover:not(:disabled) {
          background: #252d40;
          border-color: #4b5563;
        }
        .btn-icon { font-size: 0.9em; }
        .rec-dot { color: #fff; }
        .stop-icon { color: #9ca3af; }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: inherit;
          background: transparent;
          color: #94a3b8;
          border: 1.5px solid #1e2433;
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.04);
          border-color: #374151;
          color: #e2e8f0;
        }
        .btn-danger {
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: inherit;
          background: transparent;
          color: #f87171;
          border: 1.5px solid rgba(248, 113, 113, 0.3);
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-danger:hover {
          background: rgba(248, 113, 113, 0.08);
          border-color: #f87171;
        }

        /* ---- Advanced options ---- */
        .advanced-section { display: flex; flex-direction: column; gap: 0.5rem; }
        .advanced-toggle {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 0.8rem;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          padding: 0;
          transition: color 0.15s;
        }
        .advanced-toggle:hover { color: #94a3b8; }
        .advanced-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.02);
          border-radius: 8px;
          border: 1px solid #1e2433;
        }
        .option-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.85rem;
          color: #94a3b8;
          cursor: pointer;
        }
        .option-row input[type="checkbox"] {
          accent-color: #3b82f6;
          width: 15px;
          height: 15px;
          cursor: pointer;
        }

        /* ---- Info banner ---- */
        .info-banner {
          font-size: 0.8rem;
          color: #6b7280;
          background: rgba(59, 130, 246, 0.06);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          padding: 0.6rem 0.875rem;
          margin: 0;
        }

        /* ---- Spinner ---- */
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.15);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .spinner.sm { width: 16px; height: 16px; }

        /* ---- Animations ---- */
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes pulse-circle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .pulse-circle { animation: pulse-circle 1.2s ease-in-out infinite; }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        /* ---- Responsive ---- */
        @media (max-width: 480px) {
          .recorder-container { padding: 1rem; gap: 1rem; }
          .metrics-bar { gap: 1rem; }
          .btn-record { padding: 0.65rem 1.5rem; }
          .recorder-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
