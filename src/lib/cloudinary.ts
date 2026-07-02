// src/lib/cloudinary.ts
// Server-side Cloudinary client + upload helper.
// Credentials are read from env vars only — never hardcoded.

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  url: string;
  thumbnailUrl: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Uploads a single image buffer to Cloudinary, organized under
 * photosaas/{tenantId}/{eventId}/ so every tenant's photos stay isolated
 * even within one shared Cloudinary account.
 */
export async function uploadPhoto(
  buffer: Buffer,
  tenantId: string,
  eventId: string
): Promise<UploadResult> {
  const base64 = `data:image/jpeg;base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(base64, {
    folder: `photosaas/${tenantId}/${eventId}`,
    resource_type: "image",
    // Automatic quality/format optimization — Cloudinary picks the best
    // compression for the viewer's browser (webp/avif where supported).
    quality: "auto",
    fetch_format: "auto",
  });

  // Build a thumbnail URL by inserting a transformation into the delivery URL.
  // c_fill + w_400/h_400 = cropped square thumbnail, g_auto = smart crop
  // (Cloudinary's content-aware cropping, falls back to face-aware if relevant).
  const thumbnailUrl = result.secure_url.replace(
    "/upload/",
    "/upload/c_fill,w_400,h_400,g_auto,q_auto,f_auto/"
  );

  return {
    url: result.secure_url,
    thumbnailUrl,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

/**
 * Deletes a photo from Cloudinary by its public_id.
 * Called when a photo is removed from an event.
 */
export async function deletePhoto(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
/**
 * Uploads a member's selfie temporarily so the face service (which only
 * accepts image URLs, not raw bytes) can read it. Stored under a separate
 * /selfies subfolder and always deleted by the caller right after use —
 * we don't retain selfies long-term for privacy.
 */
export async function uploadSelfie(
  buffer: Buffer,
  tenantId: string,
  eventId: string
): Promise<UploadResult> {
  const base64 = `data:image/jpeg;base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(base64, {
    folder: `photosaas/${tenantId}/${eventId}/selfies`,
    resource_type: "image",
    quality: "auto",
    fetch_format: "auto",
  });

  return {
    url: result.secure_url,
    thumbnailUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

export default cloudinary;
