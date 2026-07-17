import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLeadership } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { JournalsClient } from "./journals-client";

export default async function CurriculumPage() {
  const session = await auth();
  const role = session!.user.role;

  if (!isLeadership(role)) redirect("/dashboard");

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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Revistas</h1>
        <div className="flex gap-2">
          <Link href="/curriculum/overview">
            <Button variant="outline" size="sm">Vista semestral</Button>
          </Link>
          <Link href="/curriculum/lessons">
            <Button variant="outline" size="sm">Planejar aulas</Button>
          </Link>
        </div>
      </div>
      <JournalsClient initialJournals={journals as any} classes={classes} />
    </div>
  );
}
