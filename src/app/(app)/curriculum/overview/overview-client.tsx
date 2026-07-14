"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const LESSON_TYPE_LABELS: Record<string, string> = {
  APOSTILA: "Apostila",
  AULA_EXTRA: "Aula Extra",
  CULTO_INFANTIL: "Culto Infantil",
  SEM_AULA: "Sem aula",
  TEMA_LIVRE: "Tema Livre",
};

type ClassGroup = { id: string; name: string };
type Plan = {
  date: string;
  classGroupId: string;
  tipo: string;
  curriculum: { id: string; title: string; seriesNumber: number } | null;
  licaoNumber: number | null;
  lessonType: string;
  specialTitle: string | null;
  done: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function planLabel(p: Plan | undefined) {
  if (!p) return "—";
  if (p.lessonType !== "APOSTILA") return p.specialTitle || LESSON_TYPE_LABELS[p.lessonType];
  if (p.curriculum) return `L${p.licaoNumber ?? "?"} — ${p.curriculum.title}`;
  return "Sem plano";
}

export function OverviewClient({
  plans: rawPlans,
  classes,
  sundays,
}: {
  plans: Plan[];
  classes: ClassGroup[];
  sundays: string[];
}) {
  const plans = rawPlans.map((p) => ({ ...p, date: new Date(p.date).toISOString() }));

  function copyWhatsApp() {
    const lines = ["📚 *Calendário de Aulas*\n"];
    for (const sunday of sundays) {
      const key = sunday.slice(0, 10);
      const dayPlans = plans.filter((p) => p.date.startsWith(key));
      if (dayPlans.length === 0) continue;
      lines.push(`*${formatDate(sunday)}*`);
      for (const cls of classes) {
        const ebd = dayPlans.find((p) => p.classGroupId === cls.id && p.tipo === "EBD");
        const culto = dayPlans.find((p) => p.classGroupId === cls.id && p.tipo === "CULTO");
        if (!ebd && !culto) continue;
        lines.push(`  ${cls.name}: EBD ${planLabel(ebd)} · Culto ${planLabel(culto)}`);
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" className="h-10" onClick={copyWhatsApp}>
        <Copy className="h-4 w-4 mr-2" /> Copiar calendário
      </Button>

      <div className="overflow-x-auto border rounded-lg">
        <table className="text-sm w-max">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 bg-muted/50 p-2 text-left border-r z-10 min-w-[80px]">Domingo</th>
              {classes.map((cls) => (
                <th key={cls.id} className="p-2 text-left border-r min-w-[180px]">{cls.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sundays.map((sunday) => {
              const key = sunday.slice(0, 10);
              const dayPlans = plans.filter((p) => p.date.startsWith(key));
              return (
                <tr key={sunday} className="border-t">
                  <td className="sticky left-0 bg-background p-2 border-r font-medium z-10">
                    {formatDate(sunday)}
                  </td>
                  {classes.map((cls) => {
                    const ebd = dayPlans.find((p) => p.classGroupId === cls.id && p.tipo === "EBD");
                    const culto = dayPlans.find((p) => p.classGroupId === cls.id && p.tipo === "CULTO");
                    return (
                      <td key={cls.id} className="p-2 border-r align-top">
                        <p className={cn("text-xs", ebd?.done && "text-muted-foreground line-through")}>
                          EBD: {planLabel(ebd)}
                        </p>
                        <p className={cn("text-xs", culto?.done && "text-muted-foreground line-through")}>
                          Culto: {planLabel(culto)}
                        </p>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
