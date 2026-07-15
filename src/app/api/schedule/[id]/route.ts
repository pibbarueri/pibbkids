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
  const { slotType, classGroupId, role, userId } = body;

  const slot = await prisma.scheduleSlot.update({
    where: { id },
    data: {
      ...(slotType !== undefined && { slotType }),
      ...(classGroupId !== undefined && { classGroupId }),
      ...(role !== undefined && { role }),
      ...(userId !== undefined && { userId }),
    },
    include: {
      user: { select: { id: true, name: true } },
      classGroup: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(slot);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.scheduleSlot.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
