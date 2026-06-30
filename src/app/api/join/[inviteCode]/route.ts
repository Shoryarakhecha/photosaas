// src/app/api/join/[inviteCode]/route.ts
// GET  → public, returns event info so the join page can show event name/date
// POST → public, creates the Member — but ONLY if the email was already
//        verified via POST /send-otp + POST /verify-otp first.
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

  const { name, phone } = parsed.data;
  const email = parsed.data.email?.toLowerCase();

  // Email is now required and must have a verified OTP record before
  // a Member can be created — this is what actually enforces "real email" trust.
  if (!email) {
    return NextResponse.json({ error: "Email is required to join." }, { status: 400 });
  }

  const otp = await prisma.otpVerification.findUnique({
    where: { eventId_email: { eventId: event.id, email } },
  });

  if (!otp || !otp.verified) {
    return NextResponse.json(
      { error: "Please verify your email with the code we sent before joining." },
      { status: 403 }
    );
  }

  try {
    const member = await prisma.member.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        name,
        email,
        phone: phone || null,
        emailVerified: true,
        joinedVia: "SELF_JOIN",
      },
    });

    // Clean up the OTP record now that it's been consumed
    await prisma.otpVerification.delete({ where: { id: otp.id } });

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
