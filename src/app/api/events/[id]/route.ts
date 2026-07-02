// src/app/api/events/[id]/route.ts
// GET    → fetch one event with its members (tenant-scoped)
// PATCH  → update event details
// DELETE → soft-delete (sets status to DELETED, never hard-deletes) 

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageEvents } from "@/lib/auth";
import { CreateEventSchema } from "@/lib/validations";

interface Params {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // tenantId in the where clause is what prevents one tenant from
  // ever reading another tenant's event, even if they guess the id.
  const event = await prisma.event.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      createdBy: { select: { name: true } },
      members: { orderBy: { createdAt: "desc" } },
      _count: { select: { members: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!canManageEvents(user.role)) {
    return NextResponse.json({ error: "You don't have permission to edit events." }, { status: 403 });
  }

  const existing = await prisma.event.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = CreateEventSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, description, date, isPublic, allowMemberUploads } = parsed.data;

  const event = await prisma.event.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(date && { date: new Date(date) }),
      ...(isPublic !== undefined && { isPublic }),
      ...(allowMemberUploads !== undefined && { allowMemberUploads }),
    },
  });

  return NextResponse.json({ success: true, event });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!canManageEvents(user.role)) {
    return NextResponse.json({ error: "You don't have permission to delete events." }, { status: 403 });
  }

  const existing = await prisma.event.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Soft delete — keeps photos/members history intact, just hides it from the UI.
  await prisma.event.update({
    where: { id: params.id },
    data: { status: "DELETED" },
  });

  return NextResponse.json({ success: true });
}
