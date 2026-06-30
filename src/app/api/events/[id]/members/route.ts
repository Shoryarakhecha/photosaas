// src/app/api/events/[id]/members/route.ts
// POST → owner/staff manually adds a member to an event (no invite link needed)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageEvents } from "@/lib/auth";
import { AddMemberSchema } from "@/lib/validations";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!canManageEvents(user.role)) {
    return NextResponse.json({ error: "You don't have permission to add members." }, { status: 403 });
  }

  // Confirm the event belongs to this tenant before attaching a member to it.
  const event = await prisma.event.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = AddMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, phone } = parsed.data;

  try {
    const member = await prisma.member.create({
      data: {
        tenantId: user.tenantId,
        eventId: event.id,
        name,
        email: email || null,
        phone: phone || null,
        joinedVia: "MANUAL",
      },
    });

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error: any) {
    // Unique constraint on [eventId, email] — same email added twice
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "This email has already joined this event." },
        { status: 409 }
      );
    }
    console.error("[ADD MEMBER ERROR]", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
