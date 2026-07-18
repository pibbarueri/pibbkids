import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classGroupId = searchParams.get("classGroupId");

  const journals = await prisma.journal.findMany({
    where: {
      ...(classGroupId && { classGroupId }),
    },
    include: { classGroup: { select: { id: true, name: true } } },
    orderBy: [{ series: "asc" }, { edition: "asc" }],
  });

  return NextResponse.json(journals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const journal = await prisma.journal.create({
    data: {
      title: body.title,
      series: body.series,
      edition: body.edition,
      totalWeeks: body.totalWeeks,
      classGroupId: body.classGroupId,
      usage: body.usage,
      teacherCopies: body.teacherCopies ?? 0,
      studentCopies: body.studentCopies ?? 0,
      hasVisualResources: body.hasVisualResources ?? false,
    },
    include: { classGroup: { select: { id: true, name: true } } },
  });

  return NextResponse.json(journal, { status: 201 });
}
