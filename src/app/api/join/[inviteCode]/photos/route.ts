// src/app/api/join/[inviteCode]/photos/route.ts
// GET  → public gallery — returns all photos for the event (no auth)
// POST → guest photo upload — only allowed if the event has
//        allowMemberUploads enabled, and only for a memberId that has
//        actually joined this event (self-join or manually added).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPhoto } from "@/lib/cloudinary";
import { extractEmbeddings } from "@/lib/faceService";

interface Params {
  params: { inviteCode: string };
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per photo
const MAX_FILES_PER_REQUEST = 10; // stricter than staff's 20 — public-ish endpoint
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

  return NextResponse.json({ photos });
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

  // Confirm this memberId genuinely belongs to this event — prevents a
  // random visitor from spoofing an arbitrary id to bypass the join flow.
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

  const existingCount = await prisma.photo.count({ where: { eventId: event.id } });

  const uploaded: any[] = [];
  const failed: { name: string; reason: string }[] = [];

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
      const result = await uploadPhoto(buffer, event.tenantId, event.id);

      const photo = await prisma.photo.create({
        data: {
          tenantId: event.tenantId,
          eventId: event.id,
          uploadedByMemberId: member.id, // guest upload — no staff uploadedById
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          order: existingCount + i,
        },
      });

      // Same non-blocking pattern as staff uploads — face extraction must
      // never fail the upload itself.
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
  });
}