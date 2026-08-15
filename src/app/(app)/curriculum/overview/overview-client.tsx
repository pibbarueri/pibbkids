"use client";

import { cn } from "@/lib/utils";

const LESSON_TYPE_LABELS: Record<string, string> = {
  WORKBOOK: "Apostila",
  EXTRA_CLASS: "Aula Extra",
  REVIEW: "Revisão",
  QUIZ_GAME: "Quiz/Gincana",
  NO_CLASS: "Sem aula",
  FREE_TOPIC: "Tema Livre",
};

type ClassGroup = { id: string; name: string };
type Plan = {
  date: string;
  classGroupId: string;
  type: string;
  journal: { id: string; title: string; edition: number } | null;
  lessonNumber: number | null;
  lessonType: string;
  specialTitle: string | null;
  done: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

function planLabel(p: Plan | undefined) {
  if (!p) return "—";
  if (p.lessonType !== "WORKBOOK") return p.specialTitle || LESSON_TYPE_LABELS[p.lessonType];
  if (p.journal) return `L${p.lessonNumber ?? "?"} — ${p.journal.title}`;
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

  return (
    <div className="space-y-3">
      <div className="overflow-auto border rounded-lg max-h-[70vh]">
        <table className="text-sm w-max">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky top-0 left-0 bg-muted p-2 text-left border-r z-20 min-w-[80px]">Domingo</th>
              {classes.map((cls) => (
                <th key={cls.id} className="sticky top-0 bg-muted p-2 text-left border-r z-10 min-w-[180px]">{cls.name}</th>
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
                    const ebd = dayPlans.find((p) => p.classGroupId === cls.id && p.type === "EBD");
                    const culto = dayPlans.find((p) => p.classGroupId === cls.id && p.type === "CULTO");
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
