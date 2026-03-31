// =============================================
// src/lib/queue/qstash.ts
// Cola de procesamiento de vídeo usando QStash de Upstash
// QStash es serverless y no requiere worker persistente en Vercel
// Documentación: https://upstash.com/docs/qstash
// =============================================

import type { ProcessingJob } from "@/types";

const QSTASH_URL = process.env.QSTASH_URL!;
const QSTASH_TOKEN = process.env.QSTASH_TOKEN!;
// URL del worker externo (Railway/Fly.io) que procesará el vídeo
const WORKER_ENDPOINT = process.env.WORKER_ENDPOINT!;

/**
 * Encola un job de procesamiento de vídeo en QStash.
 * QStash entregará el payload al WORKER_ENDPOINT con reintentos automáticos.
 *
 * @param job - Datos del job (recording_id, raw_path, user_id)
 * @returns messageId de QStash para trazabilidad
 */
export async function enqueueProcessingJob(
  job: ProcessingJob
): Promise<string> {
  if (!QSTASH_URL || !QSTASH_TOKEN || !WORKER_ENDPOINT) {
    throw new Error(
      "Variables de entorno de QStash no configuradas: QSTASH_URL, QSTASH_TOKEN, WORKER_ENDPOINT"
    );
  }

  const response = await fetch(`${QSTASH_URL}${WORKER_ENDPOINT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${QSTASH_TOKEN}`,
      // Reintentos con backoff exponencial
      "Upstash-Retries": "3",
      "Upstash-Retry-Backoff": "exponential",
      // Callback cuando el job se completa (opcional, para monitoreo)
      // "Upstash-Callback": `${process.env.NEXT_PUBLIC_APP_URL}/api/job-callback`,
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al encolar job en QStash: ${error}`);
  }

  const data = await response.json();
  console.log(`[Queue] Job encolado para recording ${job.recording_id}`, {
    messageId: data.messageId,
  });

  return data.messageId as string;
}

// =============================================
// Alternativa: BullMQ + Upstash Redis
// Descomenta si prefieres BullMQ sobre QStash
// =============================================

/*
import { Queue } from "bullmq";
import { Redis } from "@upstash/redis";

// Conexión a Upstash Redis
const connection = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const videoQueue = new Queue<ProcessingJob>("video-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5s inicial, luego 10s, 20s
    },
    removeOnComplete: { age: 86400 }, // Mantener completados 24h
    removeOnFail: { age: 604800 }, // Mantener fallidos 7 días
  },
});

export async function enqueueProcessingJobBullMQ(job: ProcessingJob) {
  const result = await videoQueue.add("process-video", job, {
    priority: job.priority ?? 5,
  });
  console.log(`[BullMQ] Job encolado: ${result.id}`);
  return result.id;
}
*/
