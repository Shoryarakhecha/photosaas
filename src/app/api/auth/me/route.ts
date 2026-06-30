// src/app/api/auth/me/route.ts
// Returns current logged-in user info from JWT cookie

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tokenPayload = await getCurrentUser();

  if (!tokenPayload) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch fresh data from DB
  const user = await prisma.user.findUnique({
    where: { id: tokenPayload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
