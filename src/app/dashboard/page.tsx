// src/app/dashboard/page.tsx
// Server component — reads user from cookie on server side

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const tokenPayload = getCurrentUser();
  if (!tokenPayload) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: tokenPayload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
          _count: {
            select: { events: true, members: true, users: true },
          },
        },
      },
    },
  });

  if (!user) redirect("/login");

  return <DashboardClient user={user} />;
}
