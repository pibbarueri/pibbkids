"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { normalize } from "@/lib/text";

export type VisitingChild = {
  id: string;
  name: string;
  ageText: string;
  className: string | null;
  lastVisit: string;
  visits: number;
  promoted: boolean;
};

export function VisitorsListClient({ items }: { items: VisitingChild[] }) {
  const [search, setSearch] = useState("");
  const q = normalize(search);
  const visible = items.filter((c) => normalize(c.name).includes(q));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar visitante..." className="h-11 pl-9" />
      </div>
      <p className="text-xs text-muted-foreground">
        {items.length} criança{items.length === 1 ? "" : "s"} já visitou a igreja
      </p>
      <div className="space-y-2">
        {visible.map((c) => (
          <Link
            key={c.id}
            href={`/reports/visitors/${c.id}`}
            className="flex items-center gap-2 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-transform active:scale-[0.98]"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm wrap-anywhere">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.ageText} · {c.className ?? "Sem turma"} · {c.visits} visita{c.visits === 1 ? "" : "s"}, última em{" "}
                {new Date(c.lastVisit).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" })}
              </p>
            </div>
            {c.promoted && <Badge variant="secondary" className="shrink-0">Efetivada</Badge>}
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
        {visible.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum visitante encontrado.</p>}
      </div>
    </div>
  );
}
