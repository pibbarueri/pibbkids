"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/profile-menu";

type Profile = {
  name: string;
  username: string | null;
  phone: string | null;
  cpf: string | null;
  birthdate: string | null;
  motherName: string | null;
};

const PAGE_TITLES: [string, string][] = [
  ["/children", "Crianças"],
  ["/volunteers", "Voluntários"],
  ["/curriculum/overview", "Vista semestral"],
  ["/curriculum/lessons", "Aulas"],
  ["/schedule", "Escala"],
  ["/attendance", "Presença"],
  ["/materials", "Materiais"],
  ["/events", "Eventos"],
  ["/purchase-requests", "Solicitações de compra"],
  ["/curriculum", "Revistas"],
];

export function BackHeader({ profile }: { profile: Profile }) {
  const router = useRouter();
  const pathname = usePathname();

  // Vista semestral belongs under Aulas — its back returns there, not home.
  const target = pathname === "/curriculum/overview" ? "/curriculum/lessons" : "/dashboard";
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
        <ProfileMenu profile={profile} />
      </div>
    </header>
  );
}
