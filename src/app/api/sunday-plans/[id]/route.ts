import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage, isLeadership } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // PROFESSOR/AUXILIAR can only toggle `done`, and only for their own class.
  const onlyTogglingDone = Object.keys(body).every((k) => k === "done");
  if (!onlyTogglingDone && !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (onlyTogglingDone && !canManage(session.user.role)) {
    const existing = await prisma.sundayPlan.findUnique({ where: { id } });
    const preferred = await prisma.userPreferredClass.findFirst({
      where: { userId: session.user.id, classGroupId: existing?.classGroupId },
    });
    if (!preferred) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const plan = await prisma.sundayPlan.update({
    where: { id },
    data: {
      ...(body.done !== undefined && { done: body.done }),
      ...(body.journalId !== undefined && { journalId: body.journalId }),
      ...(body.licaoNumber !== undefined && { licaoNumber: body.licaoNumber }),
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
