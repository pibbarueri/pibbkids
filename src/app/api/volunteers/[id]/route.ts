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
      ...(body.name !== undefined && { name: body.name }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.cpf !== undefined && { cpf: body.cpf }),
      ...(body.birthdate !== undefined && { birthdate: body.birthdate ? new Date(body.birthdate) : null }),
      ...(body.motherName !== undefined && { motherName: body.motherName }),
      ...(body.volunteerStatus !== undefined && { volunteerStatus: body.volunteerStatus }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.functions !== undefined && {
        functions: {
          deleteMany: {},
          create: body.functions.map((f: string) => ({ function: f })),
        },
      }),
      ...(body.preferredClassIds !== undefined && {
        preferredClasses: {
          deleteMany: {},
          create: body.preferredClassIds.map((classGroupId: string) => ({ classGroupId })),
        },
      }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      volunteerStatus: true,
      active: true,
      cpf: true,
      birthdate: true,
      motherName: true,
      functions: { select: { function: true } },
      preferredClasses: { select: { classGroupId: true, classGroup: { select: { name: true } } } },
    },
  });

  return NextResponse.json(user);
}
