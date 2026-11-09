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
  observations: string | null;
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
            observations: true,
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
    .sort((a, b) => a.day.localeCompare(b.day) || a.type.localeCompare(b.type));

  const total = blocks.length;
  const present = blocks.filter((b) => b.present).length;
  const percent = total ? Math.round((present / total) * 100) : 0;
  const [semYear, semHalf] = semester.split("-");

  return (
    <div className="p-4 pb-24 space-y-4 print-landscape">
      <div className="space-y-3">
        <div>
          <h1 className="text-xl font-bold wrap-anywhere">{child.name}</h1>
          <p className="text-sm text-muted-foreground">
            {child.classGroup?.name ?? "Sem turma"} · {semHalf}º semestre {semYear}
          </p>
        </div>
        <SemesterSelect value={semester} options={semesterOptions} />
        <div className="rounded-lg border bg-background p-3 flex items-baseline justify-between gap-2">
          <p className="text-sm">
            <span className="font-semibold">{present}</span> presença{present === 1 ? "" : "s"} em{" "}
            <span className="font-semibold">{total}</span> aula{total === 1 ? "" : "s"}
          </p>
          <p className="text-lg font-bold">{percent}%</p>
        </div>
      </div>

      {total === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma aula registrada nesse semestre.</p>
      )}

      <div className="space-y-2">
        {blocks.map((b) => (
          <div
            key={b.key}
            className={cn(
              "p-3 border rounded-lg space-y-2 break-inside-avoid",
              b.present ? "bg-chart-5/10 border-chart-5/40" : "bg-primary/10 border-primary/40"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm min-w-0 wrap-anywhere">
                <span className="font-semibold">{formatDay(b.day)}</span> · {lessonLabel(b.plan)}
              </p>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white",
                  b.type === "EBD" ? "bg-chart-5" : "bg-primary"
                )}
              >
                {b.type === "CULTO" ? "Culto" : "EBD"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{b.present ? "Presente" : "Ausente"}</p>
            {b.plan?.observations && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Descrição da aula</p>
                <p className="text-sm whitespace-pre-wrap wrap-anywhere">{b.plan.observations}</p>
              </div>
            )}
            <LessonNote childId={child.id} date={b.day} type={b.type} initialNote={b.note} />
          </div>
        ))}
      </div>

      <ExportPdfButton />
    </div>
  );
}
