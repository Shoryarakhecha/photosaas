// src/lib/auth.ts
// JWT creation, verification, and cookie helpers
// Uses `jose` instead of `jsonwebtoken` because jsonwebtoken relies on Node's
// crypto module, which is NOT available in the Edge runtime that Next.js
// middleware runs in. jose works in both Node and Edge.

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
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
// CREATE JWT (async — jose signs asynchronously)
// ─────────────────────────────────────────
export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// ─────────────────────────────────────────
// VERIFY JWT (async, Edge + Node compatible)
// ─────────────────────────────────────────
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// GET CURRENT USER FROM COOKIE (Server Components / API Routes)
// ─────────────────────────────────────────
export async function getCurrentUser(): Promise<TokenPayload | null> {
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

// ─────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────
// Roles that are allowed to create/manage events.
// VIEWER is intentionally excluded — read-only role.
const EVENT_MANAGER_ROLES = ["OWNER", "ADMIN", "STAFF"];

export function canManageEvents(role: string): boolean {
  return EVENT_MANAGER_ROLES.includes(role);
}
