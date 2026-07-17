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

  const journal = await prisma.journal.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.series !== undefined && { series: body.series }),
      ...(body.edition !== undefined && { edition: body.edition }),
      ...(body.totalWeeks !== undefined && { totalWeeks: body.totalWeeks }),
      ...(body.classGroupId !== undefined && { classGroupId: body.classGroupId }),
      ...(body.usage !== undefined && { usage: body.usage }),
      ...(body.teacherCopies !== undefined && { teacherCopies: body.teacherCopies }),
      ...(body.studentCopies !== undefined && { studentCopies: body.studentCopies }),
      ...(body.hasVisualResources !== undefined && { hasVisualResources: body.hasVisualResources }),
    },
    include: { classGroup: { select: { id: true, name: true } } },
  });

  return NextResponse.json(journal);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.journal.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
