// src/app/api/join/[inviteCode]/verify-otp/route.ts
// POST → public. Member submits the 6-digit code; if correct, marks the
// OtpVerification as verified=true. The actual Member record is created
// separately by the existing POST /api/join/[inviteCode] route, which now
// requires emailVerified=true to have happened first.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashOtpCode, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { VerifyOtpSchema } from "@/lib/validations";

interface Params {
  params: { inviteCode: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const event = await prisma.event.findUnique({
    where: { inviteCode: params.inviteCode },
  });
  if (!event || event.status === "DELETED") {
    return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = VerifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid 6-digit code." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const { code } = parsed.data;

  const otp = await prisma.otpVerification.findUnique({
    where: { eventId_email: { eventId: event.id, email } },
  });

  if (!otp) {
    return NextResponse.json(
      { error: "No verification code found. Please request a new one." },
      { status: 404 }
    );
  }

  if (otp.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This code has expired. Please request a new one." },
      { status: 410 }
    );
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Please request a new code." },
      { status: 429 }
    );
  }

  const isValid = hashOtpCode(code) === otp.code;

  if (!isValid) {
    await prisma.otpVerification.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  await prisma.otpVerification.update({
    where: { id: otp.id },
    data: { verified: true },
  });

  return NextResponse.json({ success: true, verified: true });
}
