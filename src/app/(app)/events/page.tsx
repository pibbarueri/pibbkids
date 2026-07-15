import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLeadership } from "@/lib/permissions";
import { EventsClient } from "./events-client";

export default async function EventsPage() {
  const session = await auth();
  const role = session!.user.role;
  const isManager = isLeadership(role);

  const [events, classes] = await Promise.all([
    prisma.event.findMany({
      where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      include: { classes: { include: { classGroup: { select: { id: true, name: true } } } } },
      orderBy: { date: "asc" },
    }),
    prisma.classGroup.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Eventos</h1>
      <EventsClient initialEvents={events as any} classes={classes} isManager={isManager} />
    </div>
  );
}
