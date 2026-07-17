import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const plans = await prisma.sundayPlan.findMany({
    where,
    include: {
      classGroup: { select: { id: true, name: true } },
      journal: { select: { id: true, title: true, series: true, edition: true } },
    },
    orderBy: [{ date: "asc" }, { tipo: "asc" }],
  });

  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { date, classGroupId, tipo, journalId, licaoNumber, lessonType, specialTitle } = body;

  const plan = await prisma.sundayPlan.upsert({
    where: { date_classGroupId_tipo: { date: new Date(date), classGroupId, tipo } },
    update: {
      journalId: journalId ?? null,
      licaoNumber: licaoNumber ?? null,
      lessonType: lessonType ?? "APOSTILA",
      specialTitle: specialTitle ?? null,
    },
    create: {
      date: new Date(date),
      classGroupId,
      tipo,
      journalId: journalId ?? null,
      licaoNumber: licaoNumber ?? null,
      lessonType: lessonType ?? "APOSTILA",
      specialTitle: specialTitle ?? null,
    },
    include: {
      classGroup: { select: { id: true, name: true } },
      journal: { select: { id: true, title: true, series: true, edition: true } },
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
