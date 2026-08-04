import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { OccurrencesClient } from "./occurrences-client";

export default async function OccurrencesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  const isManager = canManage(role);

  const [occurrences] = await Promise.all([
    prisma.occurrence.findMany({
      where: isManager ? {} : { reporterId: session.user.id },
      include: {
        reporter: { select: { name: true, username: true } },
        resolvedBy: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Visiting this screen clears the "resolved/reopened" dot for the reporter.
    prisma.notification.upsert({
      where: { userId_key: { userId: session.user.id, key: "occurrences" } },
      update: { seenAt: new Date() },
      create: { userId: session.user.id, key: "occurrences" },
    }),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <OccurrencesClient initialOccurrences={occurrences as any} isManager={isManager} />
    </div>
  );
}
