"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/profile-menu";
import type { CustomizeOption } from "@/components/customize-dialog";

type Profile = {
  name: string;
  username: string | null;
  phone: string | null;
  cpf: string | null;
  birthdate: string | null;
  motherName: string | null;
};

// Matched with startsWith, so the more specific prefix has to come first.
const PAGE_TITLES: [string, string][] = [
  ["/children", "Crianças"],
  ["/volunteers", "Voluntários"],
  ["/reports/visitors", "Visitantes"],
  ["/reports/journals", "Revistas"],
  ["/reports/attendance", "Presença"],
  ["/reports", "Relatórios"],
  ["/curriculum/overview", "Visão semestral"],
  ["/curriculum/lessons", "Aulas"],
  ["/schedule/overview", "Visão semestral"],
  ["/schedule", "Escala"],
  ["/attendance/overview", "Frequência de alunos"],
  ["/attendance/view", "Presença"],
  ["/attendance", "Presença"],
  ["/materials", "Materiais"],
  ["/events", "Eventos"],
  ["/purchase-requests", "Solicitações de compra"],
  ["/curriculum", "Revistas"],
  ["/snacks", "Lanches"],
  ["/qrcodes", "QR Codes"],
  ["/occurrences", "Ocorrências"],
];

export function BackHeader({
  profile,
  isManager,
  customizeOptions,
  navIds,
  dashboardColumns,
  hasOccurrenceNotification,
}: {
  profile: Profile;
  isManager: boolean;
  customizeOptions: CustomizeOption[];
  navIds: string[];
  dashboardColumns: number;
  hasOccurrenceNotification: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // The overviews are now reached from Relatórios, so back returns there rather than to the
  // screen they used to hang off. Same for the report pages under /reports.
  const target =
    pathname === "/curriculum/overview" ||
    pathname === "/schedule/overview" ||
    pathname === "/attendance/overview" ||
    (pathname.startsWith("/reports/") && pathname !== "/reports")
      ? "/reports"
      : "/dashboard";
  const showBack = pathname !== "/dashboard";
  const title = PAGE_TITLES.find(([href]) => pathname.startsWith(href))?.[1];

  return (
    <header className="sticky top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-background/95 backdrop-blur px-2 py-2">
      <div className="flex items-center min-w-0">
        {showBack ? (
          <Button variant="ghost" size="icon" onClick={() => router.push(target)} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <span className="truncate font-semibold pl-1">Olá, {profile.name.split(" ")[0]}!</span>
        )}
      </div>
      <span className="text-sm font-bold text-center truncate">{title}</span>
      <div className="flex justify-end">
        <ProfileMenu
          profile={profile}
          isManager={isManager}
          customizeOptions={customizeOptions}
          navIds={navIds}
          dashboardColumns={dashboardColumns}
          hasOccurrenceNotification={hasOccurrenceNotification}
        />
      </div>
    </header>
  );
}
