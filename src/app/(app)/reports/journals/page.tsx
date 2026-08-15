import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { SERIES_LABELS, USAGE_LABELS } from "@/lib/curriculum";

const COLUMNS = [
  { label: "Turma", width: "min-w-[120px]" },
  { label: "Série", width: "min-w-[110px]" },
  { label: "Edição", width: "min-w-[70px]" },
  { label: "Título", width: "min-w-[180px]" },
  { label: "Semanas", width: "min-w-[90px]" },
  { label: "Uso", width: "min-w-[80px]" },
  { label: "Recursos visuais?", width: "min-w-[110px]" },
  { label: "Estoque aluno", width: "min-w-[80px]" },
  { label: "Estoque prof.", width: "min-w-[90px]" },
  { label: "Aulas com plano", width: "min-w-[110px]" },
  { label: "Aulas concluídas", width: "min-w-[120px]" },
];

export default async function JournalsReportPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canManage(session.user.role)) redirect("/dashboard");

  const [journals, classes, plansByJournal] = await Promise.all([
    prisma.journal.findMany({
      include: { classGroup: { select: { id: true, name: true } } },
      orderBy: [{ series: "asc" }, { edition: "asc" }],
    }),
    prisma.classGroup.findMany({ select: { id: true, name: true } }),
    // Two counts per journal: how many Sundays got a plan at all, and how many of those
    // were actually marked done — the gap between them is what's still pending.
    prisma.sundayPlan.groupBy({
      by: ["journalId", "done"],
      where: { journalId: { not: null } },
      _count: true,
    }),
  ]);

  const planCounts = new Map<string, { planned: number; done: number }>();
  for (const row of plansByJournal) {
    if (!row.journalId) continue;
    const entry = planCounts.get(row.journalId) ?? { planned: 0, done: 0 };
    entry.planned += row._count;
    if (row.done) entry.done += row._count;
    planCounts.set(row.journalId, entry);
  }

  // Grouped by class in the canonical ministry order, the same order every other screen
  // lists classes in.
  const byClass = sortClasses(classes).map((cls) => ({
    cls,
    rows: journals.filter((j) => j.classGroupId === cls.id),
  }));
  const ordered = byClass.flatMap((g) => g.rows);

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="overflow-x-auto border rounded-lg">
        <table className="text-sm w-max">
          <thead>
            <tr className="bg-muted/50">
              {COLUMNS.map((c, i) => (
                <th
                  key={c.label}
                  className={`sticky top-0 bg-muted p-2 text-left ${c.width} ${
                    i < COLUMNS.length - 1 ? "border-r" : ""
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((j) => {
              const counts = planCounts.get(j.id) ?? { planned: 0, done: 0 };
              return (
                <tr key={j.id} className="border-t">
                  <td className="p-2 border-r align-top">{j.classGroup.name}</td>
                  <td className="p-2 border-r align-top">{SERIES_LABELS[j.series] ?? j.series}</td>
                  <td className="p-2 border-r align-top">{j.edition}</td>
                  <td className="p-2 border-r align-top wrap-anywhere">{j.title}</td>
                  <td className="p-2 border-r align-top">{j.totalWeeks ?? "—"}</td>
                  <td className="p-2 border-r align-top">{USAGE_LABELS[j.usage] ?? j.usage}</td>
                  <td className="p-2 border-r align-top">{j.hasVisualResources ? "Sim" : "Não"}</td>
                  <td className="p-2 border-r align-top">{j.studentCopies}</td>
                  <td className="p-2 border-r align-top">{j.teacherCopies}</td>
                  <td className="p-2 border-r align-top">{counts.planned}</td>
                  <td className="p-2 align-top">{counts.done}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ordered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma revista cadastrada.</p>
        )}
      </div>
    </div>
  );
}
