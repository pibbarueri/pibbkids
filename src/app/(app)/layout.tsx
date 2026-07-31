import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { BottomNav } from "@/components/bottom-nav";
import { BackHeader } from "@/components/back-header";
import { parseAppSettings, resolveLayout } from "@/lib/navigation";

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

  const [settingsRow, hasApoioGeral] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.volunteerFunction.findFirst({
      where: { userId: session.user.id, function: "APOIO_GERAL" },
    }),
  ]);
  const settings = parseAppSettings(settingsRow?.appSettings);
  const roleOpts = { hasApoioGeral: !!hasApoioGeral };
  const { nav, dashboard } = resolveLayout(session.user.role, roleOpts, settings);

  // Customize dialog lists every destination the role allows, in display order:
  // the ones currently in the nav (minus the fixed Início) followed by the rest.
  const customizeOptions = [...nav.slice(1), ...dashboard].map(({ id, label }) => ({ id, label }));

  return (
    <div className="min-h-screen flex flex-col">
      <BackHeader
        profile={profile}
        isManager={canManage(session.user.role)}
        customizeOptions={customizeOptions}
        navIds={nav.slice(1).map((d) => d.id)}
        dashboardColumns={settings.dashboard_columns}
      />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav items={nav.map(({ id, href, label }) => ({ id, href, label }))} />
    </div>
  );
}
