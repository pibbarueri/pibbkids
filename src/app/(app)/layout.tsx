import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { BottomNav } from "@/components/bottom-nav";
import { BackHeader } from "@/components/back-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // First access: force the password-change / identity flow before anything else.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, phone: true, cpf: true, birthdate: true, motherName: true, requirePasswordChange: true },
  });
  if (me?.requirePasswordChange) redirect("/first-access");

  const profile = {
    name: me!.name,
    username: me!.username,
    phone: me!.phone,
    cpf: me!.cpf,
    birthdate: me!.birthdate ? me!.birthdate.toISOString() : null,
    motherName: me!.motherName,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <BackHeader profile={profile} isManager={canManage(session.user.role)} />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav role={session.user.role} />
    </div>
  );
}
