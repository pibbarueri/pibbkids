import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage, isLeadership } from "@/lib/permissions";
import { VolunteersClient } from "./volunteers-client";

export default async function VolunteersPage() {
  const session = await auth();
  const role = session!.user.role;

  if (!canManage(role)) redirect("/dashboard");

  const showSensitive = isLeadership(role);

  const volunteers = await prisma.user.findMany({
    orderBy: [{ volunteerStatus: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      volunteerStatus: true,
      active: true,
      cpf: showSensitive,
      birthdate: showSensitive,
      motherName: showSensitive,
      functions: { select: { function: true } },
      preferredClasses: {
        select: { classGroupId: true, classGroup: { select: { name: true } } },
      },
    },
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Voluntários</h1>
      <VolunteersClient
        initialVolunteers={volunteers as any}
        isLeadership={showSensitive}
      />
    </div>
  );
}
