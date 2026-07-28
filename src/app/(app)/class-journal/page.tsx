import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { getTeacherRoomIds } from "@/lib/class-journal";
import { sortClasses } from "@/lib/classes";
import { ClassJournalClient } from "./class-journal-client";

export default async function ClassJournalPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const isManager = canManage(role);

  const roomIds = isManager ? null : await getTeacherRoomIds(session.user.id);
  if (!isManager && roomIds!.length === 0) redirect("/dashboard");

  const rooms = sortClasses(
    await prisma.classGroup.findMany({
      where: isManager ? {} : { id: { in: roomIds! } },
      orderBy: { name: "asc" },
    })
  );

  const entries = await prisma.classJournalEntry.findMany({
    where: isManager ? {} : { classGroupId: { in: roomIds! } },
    include: {
      author: { select: { name: true, username: true } },
      acknowledgedBy: { select: { name: true, username: true } },
      classGroup: { select: { id: true, name: true } },
    },
    orderBy: { entryDate: "desc" },
  });

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Diário de Sala</h1>
      <ClassJournalClient
        initialEntries={entries as any}
        rooms={rooms}
        isManager={isManager}
        currentUserId={session.user.id}
      />
    </div>
  );
}
