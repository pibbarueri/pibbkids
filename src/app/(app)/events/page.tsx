import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { EventsClient } from "./events-client";

export default async function EventsPage() {
  const session = await auth();
  const role = session!.user.role;
  const isManager = canManage(role);

  const events = await prisma.event.findMany({
    where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    orderBy: { date: "asc" },
  });

  return (
    <div className="p-4 pb-24 space-y-4">
      <EventsClient
        initialEvents={events.map((e) => ({ ...e, date: e.date.toISOString(), endDate: e.endDate?.toISOString() ?? null }))}
        isManager={isManager}
      />
    </div>
  );
}
