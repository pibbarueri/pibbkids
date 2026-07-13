import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isLeadership } from "@/lib/permissions";
import { ClassesClient } from "./classes-client";

export default async function ClassesPage() {
  const session = await auth();
  if (!isLeadership(session!.user.role)) redirect("/dashboard");

  const classes = await prisma.classGroup.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Turmas</h1>
      <ClassesClient initialClasses={classes} />
    </div>
  );
}
