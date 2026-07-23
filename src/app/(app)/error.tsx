"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Safety net for any (app) segment that throws mid-render — in practice this is almost
// always a revoked/expired session slipping through (role change, deactivation, logout
// elsewhere), since every page here is otherwise guarded. Shown instead of a raw crash.
export default function AppError() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 text-center space-y-4 shadow-lg">
        <p className="font-medium">Sua sessão expirou</p>
        <p className="text-sm text-muted-foreground">
          Faça login novamente para continuar.
        </p>
        <Button className="w-full h-12" onClick={() => router.push("/login")}>
          Fazer login
        </Button>
      </div>
    </div>
  );
}
