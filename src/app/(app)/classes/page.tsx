import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { ClassesClient } from "./classes-client";

export default async function ClassesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canManage(session.user.role)) redirect("/dashboard");

  const classes = sortClasses(await prisma.classGroup.findMany({ orderBy: { name: "asc" } }));

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Turmas</h1>
      <ClassesClient initialClasses={classes} />
    </div>
  );
}
