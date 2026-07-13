import Link from "next/link";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { ShoppingCart, PartyPopper, Users } from "lucide-react";

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
    { href: "/volunteers", label: "Voluntários", icon: Users, roles: [Role.LIDERANCA, Role.COORDENACAO] },
  ].filter((s) => s.roles.includes(role));

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
    </div>
  );
}
