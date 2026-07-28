import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { ShoppingCart, PartyPopper, ClipboardCheck, Package, BookOpen, AlertTriangle, Cookie } from "lucide-react";
import { EventsCalendar } from "@/components/dashboard/events-calendar";
import { NextSundaySchedule } from "@/components/dashboard/next-sunday-schedule";
import { BirthdaysSection } from "@/components/dashboard/birthdays-section";
import { computeUpcomingBirthdays } from "@/lib/birthdays";
import { canManage, canManageSnacks } from "@/lib/permissions";

// Local-midnight construction, matching how schedule/page.tsx builds slot dates —
// building this in UTC instead causes a timezone offset that never matches stored slots.
function getNextSunday() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = date.getDay() === 0 ? 0 : 7 - date.getDay();
  date.setDate(date.getDate() + diff);
  return date;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;

  const nextSunday = getNextSunday();
  const isManager = canManage(role);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  const [hasApoioGeral, events, scheduleSlots, upcomingEvents30d, birthdayChildren, birthdayVolunteers, lowSnacks] = await Promise.all([
    prisma.volunteerFunction.findFirst({
      where: { userId: session.user.id, function: "APOIO_GERAL" },
    }),
    prisma.event.findMany({
      where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, date: true, endDate: true, description: true },
    }),
    prisma.scheduleSlot.findMany({
      where: { date: nextSunday, userId: session.user.id },
      include: {
        user: { select: { name: true } },
        classGroup: { select: { name: true } },
      },
    }),
    prisma.event.findMany({
      where: { date: { gte: today, lt: in30Days } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, date: true, endDate: true },
    }),
    prisma.child.findMany({ where: { active: true }, select: { name: true, birthdate: true } }),
    prisma.user.findMany({
      where: { active: true, birthdate: { not: null } },
      select: { name: true, birthdate: true },
    }),
    isManager
      ? prisma.snack.findMany({ where: { quantity: { lte: 5 } }, select: { description: true, quantity: true, unit: true } })
      : Promise.resolve([]),
  ]);

  const canAccessSnacks = canManageSnacks(role, !!hasApoioGeral);

  const shortcuts = [
    { href: "/purchase-requests", label: "Compras", icon: ShoppingCart, roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.RECEPTIONIST, Role.SUPPORT] },
    { href: "/events", label: "Eventos", icon: PartyPopper, roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST, Role.SUPPORT] },
    { href: "/attendance", label: "Presença", icon: ClipboardCheck, roles: [Role.ADMIN, Role.COORDINATOR] },
    { href: "/materials", label: "Materiais", icon: Package, roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST, Role.SUPPORT] },
    { href: "/curriculum", label: "Revistas", icon: BookOpen, roles: [Role.ADMIN, Role.COORDINATOR] },
  ]
    .filter((s) => s.roles.includes(role))
    // SUPPORT/RECEPTIONIST already have Lanches as a bottom-nav tab — no need for the dashboard shortcut too.
    .concat(canAccessSnacks && role !== Role.SUPPORT && role !== Role.RECEPTIONIST ? [{ href: "/snacks", label: "Lanches", icon: Cookie, roles: [] }] : []);

  const lowSnacksMessage = lowSnacks.length > 0
    ? lowSnacks.map((s) => `Temos ${s.quantity} ${s.unit} de ${s.description}`).join("\n")
    : null;

  const birthdays = computeUpcomingBirthdays([
    ...birthdayChildren.map((c) => ({ name: c.name, birthdate: c.birthdate, kind: "child" as const })),
    ...birthdayVolunteers
      .filter((v) => v.birthdate)
      .map((v) => ({ name: v.name, birthdate: v.birthdate as Date, kind: "volunteer" as const })),
  ]);

  return (
    <div className="p-4 space-y-4">
      {shortcuts.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex flex-col items-center gap-1 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-95"
            >
              <s.icon className="h-5 w-5" />
              <span className="text-xs text-center">{s.label}</span>
            </Link>
          ))}
        </div>
      )}

      {lowSnacksMessage && (
        <div className="flex gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-200">O LANCHE ESTÁ ACABANDO!</p>
            <p className="text-sm text-orange-700 dark:text-orange-300 whitespace-pre-line">{lowSnacksMessage}</p>
          </div>
        </div>
      )}

      <NextSundaySchedule
        date={nextSunday.toISOString()}
        slots={scheduleSlots}
        events={upcomingEvents30d.map((e) => ({ ...e, date: e.date.toISOString(), endDate: e.endDate?.toISOString() ?? null }))}
      />

      <EventsCalendar
        events={events.map((e) => ({ ...e, date: e.date.toISOString(), endDate: e.endDate?.toISOString() ?? null }))}
        birthdays={[...birthdayChildren, ...birthdayVolunteers]
          .filter((p) => p.birthdate)
          .map((p) => ({
            name: p.name,
            day: (p.birthdate as Date).getUTCDate(),
            month: (p.birthdate as Date).getUTCMonth() + 1,
          }))}
      />

      <BirthdaysSection
        birthdays={birthdays.map((b) => ({ name: b.name, label: b.label, date: b.date.toISOString() }))}
      />
    </div>
  );
}
