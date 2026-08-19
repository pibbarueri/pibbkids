import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { BottomNav } from "@/components/bottom-nav";
import { BackHeader } from "@/components/back-header";
import { parseAppSettings, resolveLayout } from "@/lib/navigation";
import { getNotificationDots } from "@/lib/notifications";
import { readChangelog } from "@/lib/changelog";
import { ChangelogModal } from "@/components/changelog-modal";

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
    select: {
      name: true,
      username: true,
      phone: true,
      cpf: true,
      birthdate: true,
      motherName: true,
      requirePasswordChange: true,
      createdAt: true,
    },
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

  const [settingsRow, hasApoioGeral, changelogSeen] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.volunteerFunction.findFirst({
      where: { userId: session.user.id, function: "SUPPORT" },
    }),
    prisma.notification.findUnique({
      where: { userId_key: { userId: session.user.id, key: "changelog" } },
    }),
  ]);
  const settings = parseAppSettings(settingsRow?.appSettings);
  const roleOpts = { hasApoioGeral: !!hasApoioGeral };
  const { nav, dashboard } = resolveLayout(session.user.role, roleOpts, settings);
  const dots = await getNotificationDots(session.user.id, session.user.role, !!hasApoioGeral);

  // Fallback to the account's creation date, not an epoch — a brand-new account shouldn't
  // be shown the whole history of changes that happened before it existed.
  const changelogSeenSince = changelogSeen?.seenAt ?? me!.createdAt;
  const unseenChangelog = readChangelog().filter((e) => new Date(`${e.date}T00:00:00Z`) > changelogSeenSince);

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
        hasOccurrenceNotification={dots.occurrences}
      />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav items={nav.map(({ id, href, label }) => ({ id, href, label }))} dots={dots} />
      <ChangelogModal entries={unseenChangelog} />
    </div>
  );
}
