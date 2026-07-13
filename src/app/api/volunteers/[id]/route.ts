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

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(body.volunteerStatus !== undefined && { volunteerStatus: body.volunteerStatus }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.active !== undefined && { active: body.active }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      volunteerStatus: true,
      active: true,
      functions: { select: { function: true } },
      preferredClasses: { select: { classGroupId: true, classGroup: { select: { name: true } } } },
    },
  });

  return NextResponse.json(user);
}
