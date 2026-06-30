// src/lib/otp.ts
// OTP code generation, hashing, and verification logic.
// Codes are hashed before storage (sha256) so a DB leak doesn't expose
// live, usable codes — same principle as never storing plain passwords.

import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  // Cryptographically random 6-digit code, zero-padded (covers 000000–999999).
  const num = crypto.randomInt(0, 1_000_000);
  return num.toString().padStart(OTP_LENGTH, "0");
}

export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function getOtpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

export const OTP_MAX_ATTEMPTS = MAX_ATTEMPTS;
