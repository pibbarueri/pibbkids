import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { today } from "@/lib/dates";
import { canAccessChildReport, isSemester, semesterOf, semesterRange } from "@/lib/child-report";
import { ExportPdfButton } from "@/components/reports/export-pdf-button";
import { SemesterSelect } from "./semester-select";
import { LessonNote } from "./lesson-note";

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
const TYPE_ORDER = { EBD: 0, CULTO: 1 } as const;

// Printed as one landscape page. A named @page in globals.css forced a page break before the
// report and some browsers ignored it, so the page rule ships with this page only.
const PRINT_PAGE_CSS = "@page { size: A4 landscape; margin: 8mm; }";

function sundayKey(date: Date) {
  return new Date(date.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatDay(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" });
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

export default async function ChildReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ semester?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const child = await prisma.child.findUnique({
    where: { id },
    select: { id: true, name: true, classGroupId: true, frequency: true, createdAt: true, classGroup: { select: { name: true } } },
  });
  if (!child) notFound();
  if (!(await canAccessChildReport(session.user, child))) redirect("/children");

  const now = today();
  const currentSemester = semesterOf(now);
  const { semester: requested } = await searchParams;
  const semester = isSemester(requested) ? requested : currentSemester;
  const { start, end } = semesterRange(semester);

  // Semester picker goes back to the child's first attendance (or registration, if none).
  const firstAttendance = await prisma.attendance.findFirst({
    where: { childId: child.id, present: true },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  const firstYear = Math.min((firstAttendance?.date ?? child.createdAt).getUTCFullYear(), now.getUTCFullYear());
  const semesterOptions: string[] = [];
  for (let y = now.getUTCFullYear(); y >= firstYear; y--) {
    for (const h of [2, 1]) {
      const s = `${y}-${h}`;
      if (semesterRange(s).start <= now) semesterOptions.push(s);
    }
  }
  if (!semesterOptions.includes(semester)) semesterOptions.unshift(semester);

  // Lessons that happened up to today, only in the child's horário (EBD, Culto or both).
  const types = child.frequency === "AMBOS" ? (["EBD", "CULTO"] as const) : ([child.frequency] as const);
  const upTo = end < now ? end : now;
  // A day of slack on each side catches dates stored as local midnight (03:00 UTC).
  const range = { gte: new Date(start.getTime() - 86_400_000), lte: new Date(upTo.getTime() + 86_400_000) };

  // Attendance doesn't record the class, so lessons come from the child's current class.
  const [plans, attendance, notes] = await Promise.all([
    child.classGroupId
      ? prisma.sundayPlan.findMany({
          where: { classGroupId: child.classGroupId, date: range, type: { in: [...types] }, lessonType: { not: "NO_CLASS" } },
          select: {
            date: true,
            type: true,
            lessonType: true,
            lessonNumber: true,
            specialTitle: true,
            journal: { select: { title: true } },
          },
        })
      : [],
    prisma.attendance.findMany({
      where: { childId: child.id, present: true, date: range },
      select: { date: true, type: true },
    }),
    prisma.childLessonNote.findMany({
      where: { childId: child.id, date: range },
      select: { date: true, type: true, note: true, author: { select: { name: true } } },
    }),
  ]);

  const startKey = start.toISOString().slice(0, 10);
  const endKey = upTo.toISOString().slice(0, 10);
  const inSemester = (key: string) => key >= startKey && key <= endKey;

  const planByKey = new Map(plans.map((p) => [`${sundayKey(p.date)}|${p.type}`, p]));
  const presentKeys = new Set(attendance.map((a) => `${sundayKey(a.date)}|${a.type}`));
  const noteByKey = new Map(notes.map((n) => [`${sundayKey(n.date)}|${n.type}`, { text: n.note, author: n.author.name }]));

  // Every lesson that happened, plus any Sunday the child was marked present without a plan.
  const blocks = [...new Set([...planByKey.keys(), ...presentKeys])]
    .map((key) => {
      const [day, type] = key.split("|") as [string, "EBD" | "CULTO"];
      return { key, day, type, plan: planByKey.get(key), present: presentKeys.has(key), note: noteByKey.get(key) ?? null };
    })
    .filter((b) => inSemester(b.day))
    // EBD happens before Culto on the same Sunday.
    .sort((a, b) => a.day.localeCompare(b.day) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);

  const total = blocks.length;
  const present = blocks.filter((b) => b.present).length;
  const percent = total ? Math.round((present / total) * 100) : 0;
  const [semYear, semHalf] = semester.split("-");

  // On paper the whole semester goes on one landscape page: more lessons, more columns.
  // 52 is the worst case (26 Sundays, EBD and Culto).
  const printColumns = total <= 20 ? 5 : total <= 30 ? 6 : total <= 42 ? 7 : 8;

  return (
    <div className="p-4 pb-24 space-y-4 print:p-0 print:space-y-2 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      <style>{PRINT_PAGE_CSS}</style>
      <div className="space-y-3 print:space-y-0 print:flex print:items-end print:justify-between print:gap-4">
        <div>
          <h1 className="text-xl font-bold wrap-anywhere print:text-base">{child.name}</h1>
          <p className="text-sm text-muted-foreground print:text-xs">
            {child.classGroup?.name ?? "Sem turma"} · {semHalf}º semestre {semYear}
          </p>
        </div>
        <SemesterSelect value={semester} options={semesterOptions} />
        <div className="rounded-lg border bg-background p-3 flex items-baseline justify-between gap-2 print:p-0 print:border-0 print:gap-3">
          <p className="text-sm print:text-xs">
            <span className="font-semibold">{present}</span> presença{present === 1 ? "" : "s"} em{" "}
            <span className="font-semibold">{total}</span> aula{total === 1 ? "" : "s"}
          </p>
          <p className="text-lg font-bold print:text-base">{percent}%</p>
        </div>
      </div>

      {total === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma aula registrada nesse semestre.</p>
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 print:gap-1 print:grid-cols-[repeat(var(--print-cols),minmax(0,1fr))]"
        style={{ "--print-cols": printColumns } as React.CSSProperties}
      >
        {blocks.map((b) => (
          <div
            key={b.key}
            className={cn(
              "p-3 border rounded-lg space-y-2 break-inside-avoid print:p-1.5 print:space-y-0.5 print:rounded-md [print-color-adjust:exact] [-webkit-print-color-adjust:exact]",
              b.present ? "bg-chart-5/10 border-chart-5/40" : "bg-primary/10 border-primary/40"
            )}
          >
            <div className="flex items-center justify-between gap-2 print:gap-1">
              <p className="text-sm font-semibold print:text-[7pt]">{formatDay(b.day)}</p>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white print:px-1 print:py-0 print:text-[6pt]",
                  b.type === "EBD" ? "bg-chart-5" : "bg-primary"
                )}
              >
                {b.type === "CULTO" ? "Culto" : "EBD"}
              </span>
            </div>
            <p className="text-sm wrap-anywhere line-clamp-2 print:text-[7pt] print:leading-tight">{lessonLabel(b.plan)}</p>
            <p className="text-xs text-muted-foreground print:text-[6pt]">{b.present ? "Presente" : "Ausente"}</p>
            <LessonNote childId={child.id} date={b.day} type={b.type} initialNote={b.note} />
          </div>
        ))}
      </div>

      <ExportPdfButton />
    </div>
  );
}
