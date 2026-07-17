import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage, isLeadership } from "@/lib/permissions";
import { FunctionType, Role } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(6),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  birthdate: z.string().optional(),
  motherName: z.string().optional(),
  role: z.nativeEnum(Role),
  functions: z.array(z.nativeEnum(FunctionType)).optional(),
  preferredClassIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const showSensitive = isLeadership(session.user.role);

  const volunteers = await prisma.user.findMany({
    where: { active: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      phone: true,
      role: true,
      status: true,
      active: true,
      cpf: showSensitive,
      birthdate: showSensitive,
      motherName: showSensitive,
      functions: { select: { function: true } },
      preferredClasses: { select: { classGroupId: true, classGroup: { select: { name: true } } } },
    },
  });

  return NextResponse.json(volunteers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) {
    return NextResponse.json({ error: "Usuário já cadastrado" }, { status: 409 });
  }

  const { password, functions, preferredClassIds, birthdate, ...rest } = parsed.data;

  const user = await prisma.user.create({
    data: {
      ...rest,
      birthdate: birthdate ? new Date(birthdate) : undefined,
      password: await bcrypt.hash(password, 12),
      status: "APPROVED",
      functions: functions?.length ? { create: functions.map((f) => ({ function: f })) } : undefined,
      preferredClasses: preferredClassIds?.length
        ? { create: preferredClassIds.map((id) => ({ classGroupId: id })) }
        : undefined,
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
      birthdate: true,
      motherName: true,
      functions: { select: { function: true } },
      preferredClasses: { select: { classGroupId: true, classGroup: { select: { name: true } } } },
    },
  });

  return NextResponse.json(user, { status: 201 });
}
