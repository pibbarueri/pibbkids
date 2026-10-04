import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditSchedule } from "@/lib/permissions";

// Slots one volunteer serves in a date range ("YYYY-MM-DD", inclusive). The volunteer
// schedule calendar loads it month by month.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canEditSchedule(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to are required" }, { status: 400 });

  const slots = await prisma.scheduleSlot.findMany({
    where: { userId: id, date: { gte: new Date(from), lte: new Date(to) } },
    include: { classGroup: { select: { id: true, name: true } } },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  });
  return NextResponse.json(slots);
}
