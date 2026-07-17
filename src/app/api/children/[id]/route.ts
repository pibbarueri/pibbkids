import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const child = await prisma.child.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.birthdate !== undefined && { birthdate: new Date(body.birthdate) }),
      ...(body.fatherName !== undefined && { fatherName: body.fatherName }),
      ...(body.motherName !== undefined && { motherName: body.motherName }),
      ...(body.fatherPhone !== undefined && { fatherPhone: body.fatherPhone }),
      ...(body.motherPhone !== undefined && { motherPhone: body.motherPhone }),
      ...(body.frequency !== undefined && { frequency: body.frequency }),
      ...(body.allergies !== undefined && { allergies: body.allergies }),
      ...(body.restrictions !== undefined && { restrictions: body.restrictions }),
      ...(body.classGroupId !== undefined && { classGroupId: body.classGroupId }),
    },
    include: { classGroup: { select: { name: true } } },
  });

  return NextResponse.json(child);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  // Attendance rows reference the child with no cascade — remove them first.
  await prisma.attendance.deleteMany({ where: { childId: id } });
  await prisma.child.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
