import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

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

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Olá, {session!.user.name.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</p>
      </div>
    </div>
  );
}
