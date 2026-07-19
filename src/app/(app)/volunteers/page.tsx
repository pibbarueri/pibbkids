import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage, isLeadership } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { VolunteersClient } from "./volunteers-client";

export default async function VolunteersPage() {
  const session = await auth();
  const role = session!.user.role;

  if (!canManage(role)) redirect("/dashboard");

  const showSensitive = isLeadership(role);

  const classes = await prisma.classGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const volunteers = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      phone: true,
      role: true,
      status: true,
      active: true,
      cpf: showSensitive,
      documentUrl: showSensitive,
      birthdate: showSensitive,
      motherName: showSensitive,
      functions: { select: { function: true } },
      preferredClasses: {
        select: { classGroupId: true, classGroup: { select: { name: true } } },
      },
    },
  });

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Voluntários</h1>
      <VolunteersClient
        initialVolunteers={volunteers as any}
        classes={sortClasses(classes)}
        isLeadership={showSensitive}
      />
    </div>
  );
}
