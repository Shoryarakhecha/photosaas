// src/app/api/join/[inviteCode]/photos/route.ts
// GET → public gallery for an event, accessible via its invite link.
// No auth — anyone holding the invite link/QR can view photos, matching
// the self-join model (the link itself is the access control).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { inviteCode: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const event = await prisma.event.findUnique({
    where: { inviteCode: params.inviteCode },
    select: { id: true, status: true },
  });

  if (!event || event.status === "DELETED") {
    return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
  }

  const photos = await prisma.photo.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
    select: { id: true, url: true, thumbnailUrl: true, width: true, height: true },
  });

  return NextResponse.json({ photos });
}
