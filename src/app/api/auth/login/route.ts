// src/app/api/auth/login/route.ts
// Authenticates user within a specific tenant (org slug required)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, COOKIE_OPTIONS } from "@/lib/auth";
import { LoginSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── 1. Validate input ──
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, orgSlug } = parsed.data;

    // ── 2. Find tenant by slug ──
    const tenant = await prisma.tenant.findUnique({
      where: { slug: orgSlug, isActive: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Organization not found. Check your organization ID." },
        { status: 404 }
      );
    }

    // ── 3. Find user within that tenant ──
    const user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: email.toLowerCase(),
        },
      },
    });

    if (!user || !user.isActive) {
      // Generic message — don't reveal whether email exists
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // ── 4. Verify password ──
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // ── 5. Create JWT ──
    const token = createToken({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
      tenantSlug: tenant.slug,
    });

    // ── 6. Set cookie + return ──
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    });

    response.cookies.set(COOKIE_OPTIONS.name, token, COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
