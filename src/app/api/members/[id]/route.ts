// src/app/api/members/[id]/route.ts
// DELETE → removes a member from an event (tenant-scoped, staff only)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageEvents } from "@/lib/auth";

interface Params {
  params: { id: string };
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!canManageEvents(user.role)) {
    return NextResponse.json(
      { error: "You don't have permission to remove members." },
      { status: 403 }
    );
  }

  const member = await prisma.member.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Also clean up any leftover OTP verification for this email+event, so the
  // same email can immediately self-join again if needed (e.g. re-testing).
const memberEmail = member.email;
  const memberEventId = member.eventId;
  if (memberEmail && memberEventId) {
    await prisma.otpVerification
      .delete({
        where: { eventId_email: { eventId: memberEventId, email: memberEmail } },
      })
      .catch(() => {}); // fine if there wasn't one
  }
  await prisma.member.delete({ where: { id: member.id } });

  return NextResponse.json({ success: true });
}