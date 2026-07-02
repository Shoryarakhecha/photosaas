// src/app/api/events/[id]/photos/rescan/route.ts
// POST → re-attempts face extraction for photos in this event that don't
// have embeddings yet (e.g. face service was cold/erroring during original
// upload). Processes a small batch per call so this never risks a
// serverless timeout — the client calls this repeatedly until "remaining" is 0.
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageEvents } from "@/lib/auth";
import { extractEmbeddings } from "@/lib/faceService";

interface Params {
  params: { id: string };
}

const BATCH_SIZE = 5; // kept small since each face-service call can be slow

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!canManageEvents(user.role)) {
    return NextResponse.json(
      { error: "You don't have permission to do this." },
      { status: 403 }
    );
  }

  const event = await prisma.event.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const pending = await prisma.photo.findMany({
    where: { eventId: event.id, embeddings: { equals: Prisma.JsonNull } },
    select: { id: true, url: true },
    take: BATCH_SIZE,
  });

  const totalRemaining = await prisma.photo.count({
    where: { eventId: event.id, embeddings: { equals: Prisma.JsonNull } },
  });

  if (pending.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, remaining: 0 });
  }

  let succeeded = 0;
  for (const photo of pending) {
    try {
      const faces = await extractEmbeddings(photo.url);
      if (faces.length > 0) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { embeddings: faces.map((f) => f.embedding) },
        });
        succeeded++;
      }
    } catch (err) {
      console.error("[RESCAN ERROR]", photo.id, err);
    }
  }

  return NextResponse.json({
    processed: pending.length,
    succeeded,
    remaining: totalRemaining - pending.length,
  });
}