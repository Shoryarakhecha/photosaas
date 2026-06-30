// src/app/api/events/[id]/live/route.ts
// GET → lightweight poll endpoint returning current members + photos for an
// event. Used by the owner's event detail page to auto-refresh without a
// full page reload, so new self-joins and uploads appear without the owner
// hitting refresh manually.
//
// This is plain polling, not websockets — simpler to reason about and
// sufficient at this scale (a handful of staff watching one event at a time).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface Params {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const event = await prisma.event.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    select: {
      members: { orderBy: { createdAt: "desc" } },
      photos: {
        orderBy: { order: "asc" },
        select: { id: true, url: true, thumbnailUrl: true, width: true, height: true },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ members: event.members, photos: event.photos });
}
