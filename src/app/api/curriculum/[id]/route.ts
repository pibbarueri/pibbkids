import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const curriculum = await prisma.curriculum.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.seriesType !== undefined && { seriesType: body.seriesType }),
      ...(body.seriesNumber !== undefined && { seriesNumber: body.seriesNumber }),
      ...(body.totalWeeks !== undefined && { totalWeeks: body.totalWeeks }),
      ...(body.uso !== undefined && { uso: body.uso }),
      ...(body.copiasProfessor !== undefined && { copiasProfessor: body.copiasProfessor }),
      ...(body.copiasAluno !== undefined && { copiasAluno: body.copiasAluno }),
      ...(body.comprarProfessor !== undefined && { comprarProfessor: body.comprarProfessor }),
      ...(body.recursosVisuais !== undefined && { recursosVisuais: body.recursosVisuais }),
    },
    include: { classGroup: { select: { id: true, name: true } } },
  });

  return NextResponse.json(curriculum);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.curriculum.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
