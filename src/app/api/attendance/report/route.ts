import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canViewAttendanceOverview } from "@/lib/permissions";
import { dayRangeUTC, dayKey } from "@/lib/dates";

// Read-only aggregation for the Presença report calendar — distinct from the day-of write
// path in src/app/api/attendance/route.ts, so marking attendance is untouched by this.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAttendanceOverview(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (date) {
    const { start, end } = dayRangeUTC(date);
    const rows = await prisma.attendance.findMany({
      where: { date: { gte: start, lt: end }, present: true },
      select: {
        id: true,
        type: true,
        child: { select: { name: true, classGroup: { select: { name: true } } } },
      },
      orderBy: { child: { name: "asc" } },
    });
    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        childName: r.child.name,
        className: r.child.classGroup?.name ?? null,
      }))
    );
  }

  if (from && to) {
    const { start } = dayRangeUTC(from);
    const { end } = dayRangeUTC(to);
    const rows = await prisma.attendance.findMany({
      where: { date: { gte: start, lt: end }, present: true },
      select: { date: true },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = dayKey(r.date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return NextResponse.json(Object.fromEntries(counts));
  }

  return NextResponse.json({ error: "date, or from+to, is required" }, { status: 400 });
}
