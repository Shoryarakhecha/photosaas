// src/lib/faceService.ts
// Thin client for the Python face-recognition microservice on Render.
// Timeouts are generous because the service uses lazy model loading —
// the FIRST request after a cold start pays for both waking the container
// AND loading buffalo_sc into memory, which can take well over a minute.

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL;
const REQUEST_TIMEOUT_MS = 100_000; // 100s — covers cold start + model load

export interface FaceEmbeddingResult {
  embedding: number[];
  bbox: number[];
  confidence: number;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Calls POST /extract-embeddings with an image URL (must be publicly
 * reachable — Cloudinary URLs work fine). Returns one entry per detected face.
 */
export async function extractEmbeddings(imageUrl: string): Promise<FaceEmbeddingResult[]> {
  if (!FACE_SERVICE_URL) throw new Error("FACE_SERVICE_URL is not configured");

  const res = await fetchWithTimeout(
    `${FACE_SERVICE_URL}/extract-embeddings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    },
    REQUEST_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Face service /extract-embeddings failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.faces as FaceEmbeddingResult[];
}

/**
 * Calls POST /compare. `candidates` maps photoId -> array of face embeddings
 * for that photo (a photo can have multiple faces) — matches Photo.embeddings
 * shape exactly, no reshaping needed.
 */
export async function compareEmbeddings(
  selfieEmbedding: number[],
  candidates: Record<string, number[][]>,
  threshold = 0.45
): Promise<{ matchedPhotoIds: string[]; scores: Record<string, number> }> {
  if (!FACE_SERVICE_URL) throw new Error("FACE_SERVICE_URL is not configured");

  const res = await fetchWithTimeout(
    `${FACE_SERVICE_URL}/compare`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selfie_embedding: selfieEmbedding,
        candidates,
        threshold,
      }),
    },
    REQUEST_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Face service /compare failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return { matchedPhotoIds: data.matched_photo_ids, scores: data.scores };
}