import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Users } from "lucide-react";

const REPORTS = [
  { href: "/reports/visitors", label: "Visitantes", icon: Users },
];

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="p-4 space-y-2">
      {REPORTS.map((r) => (
        <Link
          key={r.href}
          href={r.href}
          className="flex items-center gap-3 p-4 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-[0.98]"
        >
          <r.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="font-medium text-sm">{r.label}</span>
        </Link>
      ))}
    </div>
  );
}
