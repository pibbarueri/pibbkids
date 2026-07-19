import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { ShoppingCart, PartyPopper, ClipboardCheck, Package, BookOpen, Cake } from "lucide-react";
import { EventsCalendar } from "@/components/dashboard/events-calendar";
import { NextSundaySchedule } from "@/components/dashboard/next-sunday-schedule";
import { computeUpcomingBirthdays } from "@/lib/birthdays";
import { isLeadership } from "@/lib/permissions";
import { getBoolSetting, SETTING_FIRST_ACCESS_BYPASS_CPF } from "@/lib/settings";
import { FirstAccessToggle } from "@/components/dashboard/first-access-toggle";

function getNextSunday() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diff = utc.getUTCDay() === 0 ? 0 : 7 - utc.getUTCDay();
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc;
}

export default async function DashboardPage() {
  const session = await auth();
  const role = session!.user.role;

  const shortcuts = [
    { href: "/purchase-requests", label: "Compras", icon: ShoppingCart, roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.RECEPTIONIST] },
    { href: "/events", label: "Eventos", icon: PartyPopper, roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST] },
    { href: "/attendance", label: "Presença", icon: ClipboardCheck, roles: [Role.ADMIN, Role.COORDINATOR, Role.RECEPTIONIST] },
    { href: "/materials", label: "Materiais", icon: Package, roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST] },
    { href: "/curriculum", label: "Revistas", icon: BookOpen, roles: [Role.ADMIN, Role.COORDINATOR] },
  ].filter((s) => s.roles.includes(role));

  const nextSunday = getNextSunday();

  const [events, scheduleSlots, birthdayChildren, birthdayVolunteers] = await Promise.all([
    prisma.event.findMany({
      where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, date: true, description: true },
    }),
    prisma.scheduleSlot.findMany({
      where: { date: nextSunday },
      include: {
        user: { select: { name: true } },
        classGroup: { select: { name: true } },
      },
    }),
    prisma.child.findMany({ where: { active: true }, select: { name: true, birthdate: true } }),
    prisma.user.findMany({
      where: { active: true, birthdate: { not: null } },
      select: { name: true, birthdate: true },
    }),
  ]);

  const birthdays = computeUpcomingBirthdays([
    ...birthdayChildren.map((c) => ({ name: c.name, birthdate: c.birthdate, kind: "child" as const })),
    ...birthdayVolunteers
      .filter((v) => v.birthdate)
      .map((v) => ({ name: v.name, birthdate: v.birthdate as Date, kind: "volunteer" as const })),
  ]);

  const admin = isLeadership(role);
  const bypassCpf = admin ? await getBoolSetting(SETTING_FIRST_ACCESS_BYPASS_CPF) : false;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Olá, {session!.user.name.split(" ")[0]}!</h1>
      </div>

      {admin && <FirstAccessToggle initial={bypassCpf} />}

      {shortcuts.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex flex-col items-center gap-1 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
            >
              <s.icon className="h-5 w-5" />
              <span className="text-xs text-center">{s.label}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Cake className="h-4 w-4" /> Próximos aniversários
        </h2>
        <div className="divide-y rounded-lg border">
          {birthdays.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Sem aniversários próximos 🎈
            </p>
          ) : (
            birthdays.map((b, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span className="truncate">{b.name}</span>
                <span className="shrink-0 text-muted-foreground">{b.label}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <EventsCalendar events={events.map((e) => ({ ...e, date: e.date.toISOString() }))} />
      <NextSundaySchedule date={nextSunday.toISOString()} slots={scheduleSlots} />
    </div>
  );
}
