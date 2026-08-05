import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { Role } from "@prisma/client";

// Sunday (local 00:00) of the week containing today — the current lesson.
function currentSunday(): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

const CAN_MARK: Role[] = [Role.ADMIN, Role.COORDINATOR, Role.TEACHER];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Editing lesson content is admin-only.
  const onlyTogglingDone = Object.keys(body).every((k) => k === "done");
  if (!onlyTogglingDone && !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Marking done: Teacher/Coord/Admin, and only for the current sunday's lesson.
  if (onlyTogglingDone) {
    if (!CAN_MARK.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const existing = await prisma.sundayPlan.findUnique({ where: { id } });
    const planDay = existing ? new Date(existing.date) : null;
    const planMidnight = planDay
      ? new Date(planDay.getFullYear(), planDay.getMonth(), planDay.getDate()).getTime()
      : null;
    if (planMidnight !== currentSunday().getTime()) {
      return NextResponse.json({ error: "Só é possível marcar a aula do domingo atual." }, { status: 403 });
    }
  }

  const plan = await prisma.sundayPlan.update({
    where: { id },
    data: {
      ...(body.done !== undefined && { done: body.done }),
      ...(body.journalId !== undefined && { journalId: body.journalId }),
      ...(body.lessonNumber !== undefined && { lessonNumber: body.lessonNumber }),
      ...(body.lessonType !== undefined && { lessonType: body.lessonType }),
      ...(body.specialTitle !== undefined && { specialTitle: body.specialTitle }),
    },
    include: {
      classGroup: { select: { id: true, name: true } },
      journal: { select: { id: true, title: true, series: true, edition: true } },
    },
  });

  return NextResponse.json(plan);
}
