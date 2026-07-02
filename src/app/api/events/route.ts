// src/app/api/events/route.ts
// GET  → list all events for the logged-in user's tenant
// POST → create a new event (tenant-scoped, role-checked)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageEvents } from "@/lib/auth";
import { CreateEventSchema } from "@/lib/validations";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Always scope by tenantId — this is the core multi-tenancy rule.
  const events = await prisma.event.findMany({
    where: { tenantId: user.tenantId, status: { not: "DELETED" } },
    orderBy: { date: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageEvents(user.role)) {
    return NextResponse.json(
      { error: "You don't have permission to create events." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = CreateEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, date, isPublic, allowMemberUploads } = parsed.data;

    const event = await prisma.event.create({
      data: {
        tenantId: user.tenantId,
        createdById: user.userId,
        name,
        description: description || null,
        date: new Date(date),
        isPublic: isPublic ?? false,
        allowMemberUploads: allowMemberUploads ?? false,
      },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error("[CREATE EVENT ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
