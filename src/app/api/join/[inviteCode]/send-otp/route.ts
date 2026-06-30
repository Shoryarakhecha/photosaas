// src/app/api/join/[inviteCode]/send-otp/route.ts
// POST → public. Member enters their email, we generate + email a 6-digit code.
// Rate-limited per (event, email) by simply overwriting any existing OTP —
// natural cooldown comes from the 10-min expiry plus the resend button's own
// client-side timer (not enforced server-side here to keep MVP scope small).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, hashOtpCode, getOtpExpiry } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { SendOtpSchema } from "@/lib/validations";

interface Params {
  params: { inviteCode: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const event = await prisma.event.findUnique({
    where: { inviteCode: params.inviteCode },
    include: { tenant: { select: { name: true } } },
  });

  if (!event || event.status === "DELETED") {
    return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = SendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.email?.[0] || "Invalid email" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();

  // Already joined this event with this email? No need for a new OTP.
  const existingMember = await prisma.member.findFirst({
    where: { eventId: event.id, email },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: "This email has already joined this event." },
      { status: 409 }
    );
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = getOtpExpiry();

  // Upsert — re-requesting an OTP overwrites the previous one for this email+event
  await prisma.otpVerification.upsert({
    where: { eventId_email: { eventId: event.id, email } },
    update: { code: codeHash, verified: false, attempts: 0, expiresAt },
    create: { eventId: event.id, email, code: codeHash, expiresAt },
  });

  try {
    await sendOtpEmail({
      to: email,
      code,
      eventName: event.name,
      tenantName: event.tenant.name,
    });
  } catch (error) {
    console.error("[SEND OTP EMAIL ERROR]", error);
    return NextResponse.json(
      { error: "Couldn't send the verification email. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "Verification code sent." });
}
