import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage, canViewChildReport } from "@/lib/permissions";
import { getTeacherRoomIds } from "@/lib/class-journal";
import { ExportPdfButton } from "@/components/reports/export-pdf-button";

const LESSON_TYPE_LABELS: Record<string, string> = {
  WORKBOOK: "Apostila",
  EXTRA_CLASS: "Aula Extra",
  REVIEW: "Revisão",
  QUIZ_GAME: "Quiz/Gincana",
  NO_CLASS: "Sem aula",
  FREE_TOPIC: "Tema Livre",
};

// Attendance and lesson plan dates were written both as UTC midnight and as local midnight
// (see CLAUDE.md, "Datas"). Shifting to midday before reading the date puts both on the
// same calendar day.
function sundayKey(date: Date) {
  return new Date(date.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatDay(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Plan = {
  lessonType: string;
  lessonNumber: number | null;
  specialTitle: string | null;
  journal: { title: string } | null;
};

function lessonLabel(plan: Plan | undefined) {
  if (!plan) return "Sem aula registrada";
  if (plan.lessonType !== "WORKBOOK") return plan.specialTitle || LESSON_TYPE_LABELS[plan.lessonType];
  if (plan.journal) return `${plan.journal.title}, lição ${plan.lessonNumber ?? "?"}`;
  return "Sem aula registrada";
}

export default async function ChildReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  if (!canViewChildReport(role)) redirect("/children");

  const { id } = await params;
  const child = await prisma.child.findUnique({
    where: { id },
    select: { id: true, name: true, classGroupId: true, classGroup: { select: { name: true } } },
  });
  if (!child) notFound();

  if (!canManage(role)) {
    const roomIds = await getTeacherRoomIds(session.user.id);
    if (!child.classGroupId || !roomIds.includes(child.classGroupId)) redirect("/children");
  }

  const attendance = await prisma.attendance.findMany({
    where: { childId: child.id, present: true },
    select: { date: true, type: true },
    orderBy: [{ date: "desc" }, { type: "asc" }],
  });

  // Attendance doesn't record the class, so lessons and notes come from the child's current
  // class. A child who moved up a class shows the new class's lessons for older Sundays.
  const first = attendance.at(-1)?.date;
  const last = attendance[0]?.date;
  const range = first && last
    ? { gte: new Date(first.getTime() - 86_400_000), lte: new Date(last.getTime() + 86_400_000) }
    : undefined;

  const [plans, notes] = child.classGroupId && range
    ? await Promise.all([
        prisma.sundayPlan.findMany({
          where: { classGroupId: child.classGroupId, date: range },
          select: {
            date: true,
            type: true,
            lessonType: true,
            lessonNumber: true,
            specialTitle: true,
            journal: { select: { title: true } },
          },
        }),
        prisma.classJournalEntry.findMany({
          where: { classGroupId: child.classGroupId, entryDate: range },
          select: { id: true, entryDate: true, context: true, title: true, description: true },
          orderBy: { createdAt: "asc" },
        }),
      ])
    : [[], []];

  const planByKey = new Map(plans.map((p) => [`${sundayKey(p.date)}|${p.type}`, p]));

  const rows = attendance.map((a) => ({ key: sundayKey(a.date), type: a.type }));
  // EBD/Culto notes go on the matching row. Notes logged as "Outro" go once per day, on the
  // first row of that day.
  const firstTypeByDay = new Map<string, string>();
  for (const r of [...rows].sort((x, y) => x.type.localeCompare(y.type))) {
    if (!firstTypeByDay.has(r.key)) firstTypeByDay.set(r.key, r.type);
  }
  const notesByKey = new Map<string, typeof notes>();
  for (const n of notes) {
    const day = sundayKey(n.entryDate);
    const type = n.context === "OUTRO" ? firstTypeByDay.get(day) : n.context;
    if (!type) continue;
    const key = `${day}|${type}`;
    notesByKey.set(key, [...(notesByKey.get(key) ?? []), n]);
  }

  return (
    <div className="p-4 pb-24 space-y-4 print-landscape">
      <div>
        <h1 className="text-xl font-bold wrap-anywhere">{child.name}</h1>
        <p className="text-sm text-muted-foreground">
          {child.classGroup?.name ?? "Sem turma"} · {rows.length} presença{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma presença registrada.</p>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const key = `${r.key}|${r.type}`;
          const rowNotes = notesByKey.get(key) ?? [];
          return (
            <div key={key} className="p-3 border rounded-lg bg-background space-y-2 break-inside-avoid">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium text-sm">{formatDay(r.key)}</p>
                <span className="text-xs text-muted-foreground shrink-0">{r.type === "CULTO" ? "Culto" : "EBD"}</span>
              </div>
              <p className="text-sm wrap-anywhere">{lessonLabel(planByKey.get(key))}</p>
              {rowNotes.length > 0 && (
                <div className="rounded-md bg-muted/50 p-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Anotações do(a) professor(a)</p>
                  {rowNotes.map((n) => (
                    <div key={n.id} className="text-sm">
                      <p className="font-medium wrap-anywhere">{n.title}</p>
                      <p className="whitespace-pre-wrap wrap-anywhere text-muted-foreground">{n.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExportPdfButton />
    </div>
  );
}
