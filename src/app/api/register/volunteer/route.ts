import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FunctionType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const schema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(6),
  phone: z.string().min(8),
  cpf: z.string().optional(),
  birthdate: z.string().optional(),
  motherName: z.string().optional(),
  functions: z.array(z.nativeEnum(FunctionType)).min(1),
  preferredClassIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

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
      role: Role.AUXILIAR,
      status: "PENDING",
      functions: { create: functions.map((f) => ({ function: f })) },
      preferredClasses: preferredClassIds?.length
        ? { create: preferredClassIds.map((id) => ({ classGroupId: id })) }
        : undefined,
    },
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}
