"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/profile-menu";

type Profile = {
  name: string;
  phone: string | null;
  cpf: string | null;
  birthdate: string | null;
  motherName: string | null;
};

export function BackHeader({ profile }: { profile: Profile }) {
  const router = useRouter();
  const pathname = usePathname();

  // Vista semestral belongs under Aulas — its back returns there, not home.
  const target = pathname === "/curriculum/overview" ? "/curriculum/lessons" : "/dashboard";
  const showBack = pathname !== "/dashboard";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 backdrop-blur px-2 py-2">
      {showBack ? (
        <Button variant="ghost" size="icon" onClick={() => router.push(target)} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : (
        <span className="h-9 w-9" />
      )}
      <ProfileMenu profile={profile} />
    </header>
  );
}
