import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { JournalsClient } from "./journals-client";

export default async function CurriculumPage() {
  const session = await auth();
  const role = session!.user.role;

  if (!canManage(role)) redirect("/dashboard");

  const [journals, classes] = await Promise.all([
    prisma.journal.findMany({
      include: { classGroup: { select: { id: true, name: true } } },
      orderBy: [{ series: "asc" }, { edition: "asc" }],
    }),
    prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Revistas</h1>
      <JournalsClient initialJournals={journals as any} classes={sortClasses(classes)} />
    </div>
  );
}
