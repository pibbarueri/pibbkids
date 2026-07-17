import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { ShoppingCart, PartyPopper, ClipboardCheck, Package } from "lucide-react";
import { EventsCalendar } from "@/components/dashboard/events-calendar";
import { NextSundaySchedule } from "@/components/dashboard/next-sunday-schedule";

function getNextSunday() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diff = utc.getUTCDay() === 0 ? 0 : 7 - utc.getUTCDay();
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc;
}

const ROLE_LABELS: Record<Role, string> = {
  LIDERANCA: "Liderança",
  COORDENACAO: "Coordenação",
  PROFESSOR: "Professor",
  AUXILIAR: "Auxiliar",
  RECEPCAO: "Recepção",
};

export default async function DashboardPage() {
  const session = await auth();
  const role = session!.user.role;

  const shortcuts = [
    { href: "/purchase-requests", label: "Compras", icon: ShoppingCart, roles: [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR] },
    { href: "/events", label: "Eventos", icon: PartyPopper, roles: [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR, Role.AUXILIAR, Role.RECEPCAO] },
    { href: "/attendance", label: "Presença", icon: ClipboardCheck, roles: [Role.LIDERANCA, Role.COORDENACAO, Role.RECEPCAO] },
    { href: "/materials", label: "Materiais", icon: Package, roles: [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR, Role.AUXILIAR] },
  ].filter((s) => s.roles.includes(role));

  const nextSunday = getNextSunday();

  const [events, scheduleSlots] = await Promise.all([
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
  ]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Olá, {session!.user.name.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</p>
      </div>

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

      <EventsCalendar events={events.map((e) => ({ ...e, date: e.date.toISOString() }))} />
      <NextSundaySchedule date={nextSunday.toISOString()} slots={scheduleSlots} />
    </div>
  );
}
