import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classGroupId = searchParams.get("classGroupId");
  const year = searchParams.get("year");
  const semester = searchParams.get("semester");

  const curricula = await prisma.curriculum.findMany({
    where: {
      ...(classGroupId && { classGroupId }),
      ...(year && { year: Number(year) }),
      ...(semester && { semester: Number(semester) }),
    },
    include: { classGroup: { select: { id: true, name: true } } },
    orderBy: [{ year: "desc" }, { semester: "asc" }, { seriesNumber: "asc" }],
  });

  return NextResponse.json(curricula);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const curriculum = await prisma.curriculum.create({
    data: {
      classGroupId: body.classGroupId,
      semester: body.semester,
      year: body.year,
      seriesType: body.seriesType,
      seriesNumber: body.seriesNumber,
      title: body.title,
      totalWeeks: body.totalWeeks,
      uso: body.uso,
      copiasProfessor: body.copiasProfessor ?? 0,
      copiasAluno: body.copiasAluno ?? 0,
      comprarProfessor: body.comprarProfessor ?? 0,
      recursosVisuais: body.recursosVisuais ?? false,
    },
    include: { classGroup: { select: { id: true, name: true } } },
  });

  return NextResponse.json(curriculum, { status: 201 });
}
