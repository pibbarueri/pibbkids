import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageSnacks } from "@/lib/permissions";
import { SnacksClient } from "./snacks-client";

export default async function SnacksPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;

  const hasApoioGeral = await prisma.volunteerFunction.findFirst({
    where: { userId: session.user.id, function: "SUPPORT" },
  });
  if (!canManageSnacks(role, !!hasApoioGeral)) redirect("/dashboard");

  const snacks = await prisma.snack.findMany({ orderBy: { description: "asc" } });

  return (
    <div className="p-4 pb-24 space-y-4">
      <SnacksClient initialSnacks={snacks} />
    </div>
  );
}
