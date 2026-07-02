// src/app/api/join/[inviteCode]/photos/route.ts
// GET  → public gallery — returns all photos for the event (no auth).
//        Optionally accepts ?memberId=... to also return that guest's
//        own upload count/limit, so the UI can show "X of 10 uploaded".
// POST → guest photo upload — only allowed if the event has
//        allowMemberUploads enabled, only for a memberId that has
//        actually joined this event, and capped per guest.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPhoto } from "@/lib/cloudinary";
import { extractEmbeddings } from "@/lib/faceService";

interface Params {
  params: { inviteCode: string };
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per photo
const MAX_FILES_PER_REQUEST = 10; // per single upload batch
const MAX_PHOTOS_PER_MEMBER = 10; // total cap per guest, per event
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function GET(req: NextRequest, { params }: Params) {
  const event = await prisma.event.findUnique({
    where: { inviteCode: params.inviteCode },
  });

  if (!event || event.status === "DELETED") {
    return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
  }

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id },
    select: { id: true, url: true, thumbnailUrl: true, width: true, height: true },
    orderBy: { order: "asc" },
  });

  const memberId = req.nextUrl.searchParams.get("memberId");
  let guestUpload: { count: number; limit: number } | null = null;

  if (memberId) {
    const count = await prisma.photo.count({
      where: { eventId: event.id, uploadedByMemberId: memberId },
    });
    guestUpload = { count, limit: MAX_PHOTOS_PER_MEMBER };
  }

  return NextResponse.json({ photos, guestUpload });
}

export async function POST(req: NextRequest, { params }: Params) {
  const event = await prisma.event.findUnique({
    where: { inviteCode: params.inviteCode },
  });

  if (!event || event.status === "DELETED") {
    return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
  }

  if (!event.allowMemberUploads) {
    return NextResponse.json(
      { error: "The organizer hasn't enabled guest uploads for this event." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const memberId = formData.get("memberId") as string | null;
  const files = formData.getAll("files") as File[];

  if (!memberId) {
    return NextResponse.json({ error: "Missing member identity." }, { status: 400 });
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, eventId: event.id },
  });
  if (!member) {
    return NextResponse.json(
      { error: "You need to join this event before uploading photos." },
      { status: 403 }
    );
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Upload at most ${MAX_FILES_PER_REQUEST} photos at a time.` },
      { status: 400 }
    );
  }

  // Enforce the per-guest cap. Count what they've already uploaded to this
  // event, then only accept files up to the remaining allowance.
  const alreadyUploaded = await prisma.photo.count({
    where: { eventId: event.id, uploadedByMemberId: member.id },
  });
  const remainingSlots = MAX_PHOTOS_PER_MEMBER - alreadyUploaded;

  if (remainingSlots <= 0) {
    return NextResponse.json(
      {
        error: `You've reached the ${MAX_PHOTOS_PER_MEMBER}-photo upload limit for this event.`,
        guestUpload: { count: alreadyUploaded, limit: MAX_PHOTOS_PER_MEMBER },
      },
      { status: 403 }
    );
  }

  const filesToProcess = files.slice(0, remainingSlots);
  const skippedForLimit = files.slice(remainingSlots);

  const existingCount = await prisma.photo.count({ where: { eventId: event.id } });

  const uploaded: any[] = [];
  const failed: { name: string; reason: string }[] = skippedForLimit.map((f) => ({
    name: f.name,
    reason: `Skipped — you've hit the ${MAX_PHOTOS_PER_MEMBER}-photo limit for this event.`,
  }));

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];

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
      const result = await uploadPhoto(buffer, event.tenantId, event.id);

      const photo = await prisma.photo.create({
        data: {
          tenantId: event.tenantId,
          eventId: event.id,
          uploadedByMemberId: member.id,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          order: existingCount + i,
        },
      });

      try {
        const faces = await extractEmbeddings(result.url);
        if (faces.length > 0) {
          await prisma.photo.update({
            where: { id: photo.id },
            data: { embeddings: faces.map((f) => f.embedding) },
          });
        }
      } catch (faceError) {
        console.error("[GUEST FACE EXTRACTION ERROR]", file.name, faceError);
      }

      uploaded.push(photo);
    } catch (error) {
      console.error("[GUEST PHOTO UPLOAD ERROR]", file.name, error);
      failed.push({ name: file.name, reason: "Upload failed" });
    }
  }

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
    guestUpload: { count: alreadyUploaded + uploaded.length, limit: MAX_PHOTOS_PER_MEMBER },
  });
}