// src/lib/auth.ts
// JWT creation, verification, and cookie helpers

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "photosaas_token";
const TOKEN_EXPIRY = "7d";

// ─────────────────────────────────────────
// TOKEN PAYLOAD SHAPE
// ─────────────────────────────────────────
export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  tenantSlug: string;
}

// ─────────────────────────────────────────
// CREATE JWT
// ─────────────────────────────────────────
export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// ─────────────────────────────────────────
// VERIFY JWT
// ─────────────────────────────────────────
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// GET CURRENT USER FROM COOKIE (Server Components / API Routes)
// ─────────────────────────────────────────
export function getCurrentUser(): TokenPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─────────────────────────────────────────
// PASSWORD HASHING
// ─────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─────────────────────────────────────────
// COOKIE CONFIG
// ─────────────────────────────────────────
export const COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  path: "/",
};

// ─────────────────────────────────────────
// SLUG GENERATOR (for tenant subdomains)
// ─────────────────────────────────────────
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}
