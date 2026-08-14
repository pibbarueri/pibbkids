import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { canManage, canViewAttendanceOverview } from "@/lib/permissions";
import { BookOpen, CalendarDays, ClipboardCheck, Library, Users, type LucideIcon } from "lucide-react";

type Report = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Must mirror the guard on the target page, or the item just bounces to the dashboard. */
  canAccess: (role: Role) => boolean;
};

const REPORTS: Report[] = [
  {
    href: "/reports/visitors",
    label: "Visitantes",
    description: "Crianças visitantes por domingo",
    icon: Users,
    canAccess: () => true,
  },
  {
    href: "/schedule/overview",
    label: "Escalas",
    description: "Visão semestral da escala",
    icon: CalendarDays,
    canAccess: canManage,
  },
  {
    href: "/attendance/overview",
    label: "Presença",
    description: "Visão semestral da presença",
    icon: ClipboardCheck,
    canAccess: canViewAttendanceOverview,
  },
  {
    href: "/curriculum/overview",
    label: "Aulas",
    description: "Visão semestral das aulas",
    icon: BookOpen,
    canAccess: canManage,
  },
  {
    href: "/reports/journals",
    label: "Revistas",
    description: "Séries, edições e estoque",
    icon: Library,
    canAccess: canManage,
  },
];

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const visible = REPORTS.filter((r) => r.canAccess(role));

  return (
    <div className="p-4 space-y-2">
      {visible.map((r) => (
        <Link
          key={r.href}
          href={r.href}
          className="flex items-center gap-3 p-4 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-[0.98]"
        >
          <r.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block font-medium text-sm">{r.label}</span>
            <span className="block text-xs text-muted-foreground wrap-anywhere">{r.description}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
