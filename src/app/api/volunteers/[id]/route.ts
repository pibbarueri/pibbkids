import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";

// Volunteer edit/approve is admin-only; coordinators are read-only.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.username) {
    if (!/^[a-z0-9._-]+$/.test(body.username)) {
      return NextResponse.json({ error: "Usuário deve ter só letras minúsculas sem acento, números, ponto, hífen ou underline" }, { status: 422 });
    }
    const clash = await prisma.user.findUnique({ where: { username: body.username } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: "Usuário já cadastrado" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.username !== undefined && { username: body.username }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.cpf !== undefined && { cpf: body.cpf }),
      ...(body.birthdate !== undefined && { birthdate: body.birthdate ? new Date(body.birthdate) : null }),
      ...(body.motherName !== undefined && { motherName: body.motherName }),
      ...(body.documentUrl !== undefined && { documentUrl: body.documentUrl || null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.requirePasswordChange !== undefined && { requirePasswordChange: body.requirePasswordChange }),
      ...(body.inclusionEnabled !== undefined && { inclusionEnabled: body.inclusionEnabled }),
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
      username: true,
      phone: true,
      role: true,
      status: true,
      active: true,
      cpf: true,
      documentUrl: true,
      birthdate: true,
      motherName: true,
      inclusionEnabled: true,
      functions: { select: { function: true } },
      preferredClasses: { select: { classGroupId: true, classGroup: { select: { name: true } } } },
    },
  });

  return NextResponse.json(user);
}
