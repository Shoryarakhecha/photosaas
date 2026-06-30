// src/app/dashboard/events/[id]/page.tsx

import { getCurrentUser, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import EventDetailClient from "./EventDetailClient";

interface Props {
  params: { id: string };
}

export default async function EventDetailPage({ params }: Props) {
  const tokenPayload = await getCurrentUser();
  if (!tokenPayload) redirect("/login");

  const event = await prisma.event.findFirst({
    where: { id: params.id, tenantId: tokenPayload.tenantId },
    include: {
      createdBy: { select: { name: true } },
      members: { orderBy: { createdAt: "desc" } },
      photos: { orderBy: { order: "asc" } },
    },
  });

  if (!event) notFound();

  return (
    <EventDetailClient
      event={event}
      canManage={canManageEvents(tokenPayload.role)}
    />
  );
}
