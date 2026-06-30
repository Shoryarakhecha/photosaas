// src/app/dashboard/events/page.tsx

import { getCurrentUser, canManageEvents } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import EventsListClient from "./EventsListClient";

export default async function EventsPage() {
  const tokenPayload = await getCurrentUser();
  if (!tokenPayload) redirect("/login");

  const events = await prisma.event.findMany({
    where: { tenantId: tokenPayload.tenantId, status: { not: "DELETED" } },
    orderBy: { date: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  return (
    <EventsListClient
      events={events}
      canCreate={canManageEvents(tokenPayload.role)}
    />
  );
}
