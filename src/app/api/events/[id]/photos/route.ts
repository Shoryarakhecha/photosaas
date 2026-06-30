// src/app/api/events/[id]/photos/route.ts
// GET  → list all photos for an event (tenant-scoped)
// POST → bulk upload photos (multipart/form-data, multiple files)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageEvents } from "@/lib/auth";
import { uploadPhoto } from "@/lib/cloudinary";

interface Params {
  params: { id: string };
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per photo
const MAX_FILES_PER_REQUEST = 20; // batch limit to keep one request fast & memory-safe
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const event = await prisma.event.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const photos = await prisma.photo.findMany({
    where: { eventId: params.id, tenantId: user.tenantId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!canManageEvents(user.role)) {
    return NextResponse.json(
      { error: "You don't have permission to upload photos." },
      { status: 403 }
    );
  }

  // Confirm the event belongs to this tenant before attaching any photo to it.
  const event = await prisma.event.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Upload at most ${MAX_FILES_PER_REQUEST} photos at a time.` },
      { status: 400 }
    );
  }

  // How many photos already exist, so newly uploaded ones continue the order sequence
  const existingCount = await prisma.photo.count({ where: { eventId: event.id } });

  const uploaded: any[] = [];
  const failed: { name: string; reason: string }[] = [];

  // Upload sequentially rather than Promise.all — keeps memory bounded
  // and gives Cloudinary's free tier a gentler request rate.
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!ALLOWED_TYPES.includes(file.type)) {
      failed.push({ name: file.name, reason: "Unsupported file type" });
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      failed.push({ name: file.name, reason: "File too large (max 15MB)" });
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadPhoto(buffer, user.tenantId, event.id);

      const photo = await prisma.photo.create({
        data: {
          tenantId: user.tenantId,
          eventId: event.id,
          uploadedById: user.userId,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          order: existingCount + i,
        },
      });

      uploaded.push(photo);
    } catch (error) {
      console.error("[PHOTO UPLOAD ERROR]", file.name, error);
      failed.push({ name: file.name, reason: "Upload failed" });
    }
  }

  // Set the event cover photo automatically if it doesn't have one yet
  if (uploaded.length > 0 && !event.coverUrl) {
    await prisma.event.update({
      where: { id: event.id },
      data: { coverUrl: uploaded[0].thumbnailUrl },
    });
  }

  return NextResponse.json({
    success: uploaded.length > 0,
    uploaded,
    failed,
    summary: `${uploaded.length} uploaded, ${failed.length} failed`,
  });
}
