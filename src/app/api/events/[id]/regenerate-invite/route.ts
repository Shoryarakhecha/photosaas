// src/app/api/events/[id]/regenerate-invite/route.ts
// POST → invalidate the old invite link/QR and issue a new one
// Useful if a link leaked or the event needs to stop accepting new self-joins.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageEvents } from "@/lib/auth";
import { createId } from "@/lib/ids";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!canManageEvents(user.role)) {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 });
  }

  const event = await prisma.event.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const updated = await prisma.event.update({
    where: { id: params.id },
    data: { inviteCode: createId() },
  });

  return NextResponse.json({ success: true, inviteCode: updated.inviteCode });
}
