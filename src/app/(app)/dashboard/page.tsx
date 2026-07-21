import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { ShoppingCart, PartyPopper, ClipboardCheck, Package, BookOpen, Cake, AlertTriangle, Cookie } from "lucide-react";
import { EventsCalendar } from "@/components/dashboard/events-calendar";
import { NextSundaySchedule } from "@/components/dashboard/next-sunday-schedule";
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
  const role = session!.user.role;

  const nextSunday = getNextSunday();
  const nextSundayEnd = new Date(nextSunday);
  nextSundayEnd.setDate(nextSundayEnd.getDate() + 1);
  const isManager = canManage(role);

  const hasApoioGeral = await prisma.volunteerFunction.findFirst({
    where: { userId: session!.user.id, function: "APOIO_GERAL" },
  });
  const canAccessSnacks = canManageSnacks(role, !!hasApoioGeral);

  const shortcuts = [
    { href: "/purchase-requests", label: "Compras", icon: ShoppingCart, roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.RECEPTIONIST] },
    { href: "/events", label: "Eventos", icon: PartyPopper, roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST] },
    { href: "/attendance", label: "Presença", icon: ClipboardCheck, roles: [Role.ADMIN, Role.COORDINATOR, Role.RECEPTIONIST] },
    { href: "/materials", label: "Materiais", icon: Package, roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST] },
    { href: "/curriculum", label: "Revistas", icon: BookOpen, roles: [Role.ADMIN, Role.COORDINATOR] },
  ]
    .filter((s) => s.roles.includes(role))
    .concat(canAccessSnacks ? [{ href: "/snacks", label: "Lanches", icon: Cookie, roles: [] }] : []);

  const [events, scheduleSlots, myEvents, birthdayChildren, birthdayVolunteers, lowSnacks] = await Promise.all([
    prisma.event.findMany({
      where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, date: true, endDate: true, description: true },
    }),
    prisma.scheduleSlot.findMany({
      where: { date: nextSunday, userId: session!.user.id },
      include: {
        user: { select: { name: true } },
        classGroup: { select: { name: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        date: { gte: nextSunday, lt: nextSundayEnd },
        volunteers: { some: { userId: session!.user.id } },
      },
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

  const lowSnacksMessage = lowSnacks.length > 0
    ? lowSnacks.map((s) => `há apenas ${s.quantity} ${s.unit} de ${s.description}`).join(" e ")
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
              className="flex flex-col items-center gap-1 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
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
            <p className="font-medium text-orange-800 dark:text-orange-200">Atenção: o lanche tá acabando!</p>
            <p className="text-sm text-orange-700 dark:text-orange-300">{lowSnacksMessage}</p>
          </div>
        </div>
      )}

      <NextSundaySchedule
        date={nextSunday.toISOString()}
        slots={scheduleSlots}
        events={myEvents.map((e) => ({ ...e, date: e.date.toISOString(), endDate: e.endDate?.toISOString() ?? null }))}
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
    </div>
  );
}
