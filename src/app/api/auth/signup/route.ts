// src/app/api/auth/signup/route.ts
// Creates a new tenant + owner user in one transaction

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, generateSlug, COOKIE_OPTIONS } from "@/lib/auth";
import { SignupSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── 1. Validate input ──
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orgName, name, email, password } = parsed.data;

    // ── 2. Generate unique slug ──
    let slug = generateSlug(orgName);
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      // Append random suffix to avoid collision
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // ── 3. Create tenant + owner in a transaction ──
    const passwordHash = await hashPassword(password);

    const { tenant, user } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: orgName, slug },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: "OWNER",
        },
      });

      return { tenant, user };
    });

    // ── 4. Create JWT ──
    const token = await createToken({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
      tenantSlug: tenant.slug,
    });

    // ── 5. Set cookie + return response ──
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
    console.error("[SIGNUP ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
