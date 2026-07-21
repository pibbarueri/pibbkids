import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { EventsClient } from "./events-client";

export default async function EventsPage() {
  const session = await auth();
  const role = session!.user.role;
  const isManager = canManage(role);

  const [events, volunteers] = await Promise.all([
    prisma.event.findMany({
      where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: { date: "asc" },
      include: { volunteers: { select: { userId: true, user: { select: { name: true, username: true } } } } },
    }),
    isManager
      ? prisma.user.findMany({
          where: { active: true, status: "APPROVED" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, username: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <EventsClient
        initialEvents={events as any}
        volunteers={volunteers}
        isManager={isManager}
      />
    </div>
  );
}
