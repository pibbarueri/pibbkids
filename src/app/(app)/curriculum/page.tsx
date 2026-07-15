import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLeadership } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { CurriculumClient } from "./curriculum-client";

export default async function CurriculumPage() {
  const session = await auth();
  const role = session!.user.role;

  if (!isLeadership(role)) redirect("/dashboard");

  const now = new Date();
  const year = now.getFullYear();

  const [curricula, classes] = await Promise.all([
    prisma.curriculum.findMany({
      where: { year },
      include: { classGroup: { select: { id: true, name: true } } },
      orderBy: [{ semester: "asc" }, { seriesNumber: "asc" }],
    }),
    prisma.classGroup.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Currículo</h1>
        <div className="flex gap-2">
          <Link href="/curriculum/overview">
            <Button variant="outline" size="sm">Vista semestral</Button>
          </Link>
          <Link href="/curriculum/lessons">
            <Button variant="outline" size="sm">Planejar aulas</Button>
          </Link>
        </div>
      </div>
      <CurriculumClient initialCurricula={curricula as any} classes={classes} year={year} />
    </div>
  );
}
