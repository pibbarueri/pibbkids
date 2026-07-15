"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackHeader() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/dashboard") return null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur px-2 py-2">
      <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} aria-label="Voltar ao início">
        <ArrowLeft className="h-5 w-5" />
      </Button>
    </header>
  );
}
