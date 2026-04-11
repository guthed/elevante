import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

const QUEUE_KEY = 'elevante.upload-queue.v1';
const BUCKET = 'elevante-audio';

export type UploadJob = {
  id: string;
  filePath: string; // local URI from expo-audio
  schoolId: string;
  lessonId: string;
  mimeType: string;
  durationSeconds: number;
  createdAt: string;
};

export type QueueState = {
  jobs: UploadJob[];
};

async function readQueue(): Promise<QueueState> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return { jobs: [] };
  try {
    return JSON.parse(raw) as QueueState;
  } catch {
    return { jobs: [] };
  }
}

async function writeQueue(state: QueueState): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(state));
}

export async function enqueueUpload(
  job: Omit<UploadJob, 'id' | 'createdAt'>,
): Promise<UploadJob> {
  const full: UploadJob = {
    ...job,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const state = await readQueue();
  state.jobs.push(full);
  await writeQueue(state);
  return full;
}

export async function pendingJobs(): Promise<UploadJob[]> {
  const state = await readQueue();
  return state.jobs;
}

async function dropJob(jobId: string): Promise<void> {
  const state = await readQueue();
  state.jobs = state.jobs.filter((j) => j.id !== jobId);
  await writeQueue(state);
}

/** Försök ladda upp en specifik job. Returnerar success eller error-meddelande. */
export async function uploadJob(
  job: UploadJob,
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  try {
    // Läs filen som base64 → ArrayBuffer (Supabase JS v2 stödjer båda)
    const base64 = await FileSystem.readAsStringAsync(job.filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binary = decodeBase64(base64);
    const fileName = job.filePath.split('/').pop() ?? `${job.id}.m4a`;
    const storagePath = `${job.schoolId}/${job.lessonId}/${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, binary, {
        contentType: job.mimeType,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, error: uploadError.message };
    }

    // Uppdatera lessons-raden med audio_path + recorded_at
    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        audio_path: storagePath,
        recorded_at: job.createdAt,
        audio_duration_seconds: job.durationSeconds,
        transcript_status: 'pending',
      })
      .eq('id', job.lessonId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    // Trigga transcribe-lesson Edge Function. Vi väntar inte på svar
    // (transkribering tar tid) — funktionen uppdaterar lessons.transcript_status
    // åt oss och webben pollar / uppdaterar via realtime senare.
    try {
      await supabase.functions.invoke('transcribe-lesson', {
        body: { lesson_id: job.lessonId },
      });
    } catch {
      // Ignorera fel — pipelinen kan triggas manuellt från webben senare
    }

    // Städa upp lokal fil och queue-entry
    try {
      await FileSystem.deleteAsync(job.filePath, { idempotent: true });
    } catch {
      // Ignorera städ-fel — filen är redan uppladdad
    }
    await dropJob(job.id);

    return { ok: true, storagePath };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: msg };
  }
}

/** Försök tömma hela kön. Returnerar antal lyckade och misslyckade. */
export async function flushQueue(): Promise<{ uploaded: number; failed: number }> {
  const jobs = await pendingJobs();
  let uploaded = 0;
  let failed = 0;
  for (const job of jobs) {
    const result = await uploadJob(job);
    if (result.ok) uploaded += 1;
    else failed += 1;
  }
  return { uploaded, failed };
}

// Minimal base64-decoder utan extra dependencies
function decodeBase64(input: string): Uint8Array {
  const cleaned = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const padded = cleaned.padEnd(Math.ceil(cleaned.length / 4) * 4, '=');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    const i0 = chars.indexOf(padded[i]!);
    const i1 = chars.indexOf(padded[i + 1]!);
    const i2 = chars.indexOf(padded[i + 2]!);
    const i3 = chars.indexOf(padded[i + 3]!);
    const triplet = (i0 << 18) | (i1 << 12) | ((i2 & 63) << 6) | (i3 & 63);
    bytes.push((triplet >> 16) & 0xff);
    if (padded[i + 2] !== '=') bytes.push((triplet >> 8) & 0xff);
    if (padded[i + 3] !== '=') bytes.push(triplet & 0xff);
  }
  return new Uint8Array(bytes);
}
