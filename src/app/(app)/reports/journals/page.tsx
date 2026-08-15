import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { SERIES_LABELS, USAGE_LABELS } from "@/lib/curriculum";
import { ExportPdfButton } from "@/components/reports/export-pdf-button";
import { JournalsReportClient } from "./journals-report-client";

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
    prisma.sundayPlan.findMany({
      where: { journalId: { not: null } },
      select: { journalId: true, date: true },
    }),
  ]);

  // "Concluídas" means the Sunday has already happened, not SundayPlan.done — that flag
  // was only ever set by the "mark as given" button, which was removed, so it's frozen at
  // false for every plan created since and would always report zero here.
  //
  // SundayPlan.date is a plain DateTime, not @db.Date, and is written elsewhere (see
  // sundaysInSchoolYear in src/app/(app)/curriculum/lessons/page.tsx) as server-local
  // midnight — not UTC midnight. With TZ=America/Sao_Paulo (src/instrumentation.ts) that's
  // 03:00 UTC, so the cutoff has to be built the same way, not with dates.ts's today()
  // (UTC midnight, correct only for @db.Date columns like ScheduleSlot.date). Mixing the
  // two is the exact bug CLAUDE.md warns about.
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const planCounts = new Map<string, { planned: number; done: number }>();
  for (const row of plansByJournal) {
    if (!row.journalId) continue;
    const entry = planCounts.get(row.journalId) ?? { planned: 0, done: 0 };
    entry.planned += 1;
    if (row.date <= cutoff) entry.done += 1;
    planCounts.set(row.journalId, entry);
  }

  // Grouped by class in the canonical ministry order, the same order every other screen
  // lists classes in.
  const sortedClasses = sortClasses(classes);
  const byClass = sortedClasses.map((cls) => ({
    cls,
    rows: journals.filter((j) => j.classGroupId === cls.id),
  }));
  const ordered = byClass.flatMap((g) => g.rows);

  const rows = ordered.map((j) => {
    const counts = planCounts.get(j.id) ?? { planned: 0, done: 0 };
    return {
      id: j.id,
      classGroupId: j.classGroupId,
      className: j.classGroup.name,
      series: j.series,
      edition: j.edition,
      title: j.title,
      totalWeeks: j.totalWeeks,
      usage: j.usage,
      hasVisualResources: j.hasVisualResources,
      studentCopies: j.studentCopies,
      teacherCopies: j.teacherCopies,
      planned: counts.planned,
      done: counts.done,
    };
  });

  return (
    <div className="p-4 pb-24 space-y-4 print-landscape">
      <JournalsReportClient rows={rows} classes={sortedClasses} seriesLabels={SERIES_LABELS} usageLabels={USAGE_LABELS} />
      <ExportPdfButton />
    </div>
  );
}
