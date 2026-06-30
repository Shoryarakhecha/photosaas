// src/app/api/join/[inviteCode]/route.ts
// GET  → public, returns event info so the join page can show event name/date
// POST → public, lets anyone with the link add themselves as a member
//
// IMPORTANT: this route is intentionally NOT behind getCurrentUser() auth.
// It's the self-join flow — anyone with the QR code/link should be able to use it.
// Tenant isolation is still enforced because we always look up by inviteCode,
// which is unique and only ever returns one tenant's event.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SelfJoinSchema } from "@/lib/validations";

interface Params {
  params: { inviteCode: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const event = await prisma.event.findUnique({
    where: { inviteCode: params.inviteCode },
    select: {
      id: true,
      name: true,
      description: true,
      date: true,
      coverUrl: true,
      status: true,
      tenant: { select: { name: true, logoUrl: true } },
    },
  });

  if (!event || event.status === "DELETED") {
    return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function POST(req: NextRequest, { params }: Params) {
  const event = await prisma.event.findUnique({
    where: { inviteCode: params.inviteCode },
  });

  if (!event || event.status === "DELETED") {
    return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = SelfJoinSchema.safeParse(body);
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
        tenantId: event.tenantId,
        eventId: event.id,
        name,
        email: email || null,
        phone: phone || null,
        joinedVia: "SELF_JOIN",
      },
    });

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "You've already joined this event with that email." },
        { status: 409 }
      );
    }
    console.error("[SELF JOIN ERROR]", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
