// src/app/api/photos/[id]/route.ts
// DELETE → remove a single photo (Cloudinary asset + DB record)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageEvents } from "@/lib/auth";
import { deletePhoto } from "@/lib/cloudinary";

interface Params {
  params: { id: string };
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!canManageEvents(user.role)) {
    return NextResponse.json({ error: "You don't have permission to delete photos." }, { status: 403 });
  }

  // tenantId in the where clause prevents deleting another tenant's photo
  // even if someone guesses a valid photo id.
  const photo = await prisma.photo.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
  });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  try {
    await deletePhoto(photo.publicId);
  } catch (error) {
    // Log but don't block DB cleanup — an orphaned Cloudinary asset is
    // recoverable later; a stuck DB record blocking the UI is worse.
    console.error("[CLOUDINARY DELETE ERROR]", error);
  }

  await prisma.photo.delete({ where: { id: photo.id } });

  return NextResponse.json({ success: true });
}
