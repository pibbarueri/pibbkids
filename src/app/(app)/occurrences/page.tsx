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

  const occurrences = await prisma.occurrence.findMany({
    where: isManager ? {} : { reporterId: session.user.id },
    include: {
      reporter: { select: { name: true, username: true } },
      resolvedBy: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 pb-24 space-y-4">
      <OccurrencesClient initialOccurrences={occurrences as any} isManager={isManager} />
    </div>
  );
}
